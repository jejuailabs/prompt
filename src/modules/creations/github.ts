import { LandingError } from "../landing-pages/errors";
import { LIMITS } from "../landing-pages/types";

export function githubRepository(value: string) {
  let u: URL;
  try { u = new URL(value); } catch { throw new LandingError("공개 GitHub 저장소 주소를 입력해주세요."); }
  const match = /^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(u.pathname);
  if (u.protocol !== "https:" || u.hostname !== "github.com" || u.port || u.username || u.password || u.search || u.hash || !match || match.slice(1).some(p => p === "." || p === "..")) {
    throw new LandingError("https://github.com/소유자/저장소 형식만 지원합니다.");
  }
  return { owner: match[1], repo: match[2], url: `https://github.com/${match[1]}/${match[2]}` };
}
export async function boundedBytes(response: Response, max: number) {
  if (!response.ok || !response.body) throw new LandingError("공개 저장소를 가져오지 못했습니다. 주소·공개 여부·GitHub 요청 제한을 확인해주세요.", 422);
  if (Number(response.headers.get("content-length")) > max) { await response.body.cancel(); throw new LandingError("가져올 파일의 크기 제한을 초과했습니다.", 413); }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new LandingError("가져올 파일의 크기 제한을 초과했습니다.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function importGithub(value: string, fetcher: typeof fetch = fetch) {
  const repo = githubRepository(value);
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "PLAYLAB-Creations" };
  const read = async (path: string) => {
    const result = await fetcher("https://api.github.com/repos/" + encodeURIComponent(repo.owner) + "/" + encodeURIComponent(repo.repo) + path, { headers, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000) });
    return JSON.parse((await boundedBytes(result, 1024 * 1024)).toString("utf8"));
  };
  const info = await read("");
  if (info.private !== false || typeof info.default_branch !== "string") throw new LandingError("공개 GitHub 저장소만 가져올 수 있습니다.");
  const head = await read("/commits/" + encodeURIComponent(info.default_branch));
  if (typeof head.sha !== "string" || !/^[a-f0-9]{40}$/.test(head.sha)) throw new LandingError("저장소의 고정 커밋을 확인하지 못했습니다.");
  // Construct a fixed host URL; do not follow user-supplied URLs or redirects.
  const response = await fetcher(`https://codeload.github.com/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/zip/${head.sha}`, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(60000) });
  return { bytes: await boundedBytes(response, LIMITS.zipBytes), commit: head.sha, repositoryUrl: repo.url };
}
