import { createHash } from "node:crypto";
import { unpackZip, MIME, extension } from "../landing-pages/zip";
import { LIMITS } from "../landing-pages/types";
import { inspectBundle } from "../landing-pages/resources";
import { LandingError } from "../landing-pages/errors";

const sourceExtensions = new Set("ts tsx jsx cjs mts cts py rb go rs java kt swift php cs cpp c h sh bash sql graphql gql prisma md mdx txt csv tsv yaml yml toml xml lock conf config ini properties ipynb map svelte vue astro scss sass less gitignore gitattributes editorconfig npmrc nvmrc dockerignore example sample template".split(" "));
export function sourcePolicy(name: string, folder: boolean) {
  const parts = name.toLowerCase().split("/"), base = parts.at(-1)!;
  if (parts.some(p => [".git", "node_modules", ".next", ".venv", "venv", "__pycache__", "__macosx", ".ssh", ".aws"].includes(p)) ||
      /(?:^|\/)(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|keystore)|id_rsa|id_ed25519|credentials|\.npmrc|\.netrc)$/i.test(name) && !/\.env\.(?:example|sample|template)$/i.test(name)) {
    throw new LandingError("의존성·비밀 설정 파일은 제외해주세요: " + name);
  }
  if (folder) return;
  if (!MIME[extension(name)] && !sourceExtensions.has(extension(name)) && !/^(?:license(?:\..*)?|readme|dockerfile|makefile|procfile|gemfile|\.gitignore|\.gitattributes|\.editorconfig|\.dockerignore|\.nvmrc)$/i.test(base)) {
    throw new LandingError("실행 파일·중첩 압축 또는 지원하지 않는 파일입니다: " + name);
  }
}
export function inspectSource(bytes: Uint8Array, appOrigin: string) {
  const files = unpackZip(bytes, LIMITS, sourcePolicy);
  for (const [name, data] of files) {
    const ext = extension(name);
    if (MIME[ext] && !/^(?:text\/|application\/json|image\/svg)/.test(MIME[ext])) continue;
    if (data.length > LIMITS.textBytes) throw new LandingError("소스 텍스트는 파일당 2MB 이하만 지원합니다: " + name, 413);
    let text: string;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(data); }
    catch { throw new LandingError("소스 텍스트는 UTF-8이어야 합니다: " + name); }
    // Deliberately bounded, deterministic checks; never execute submitted code.
    if (/sk-(?:proj-)?[A-Za-z0-9_-]{32,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text) ||
        /["']?(?:api[_-]?key|client[_-]?secret|service[_-]?role[_-]?key|access[_-]?token)["']?\s*[:=]\s*["'](?!your[-_ ]|example|placeholder|replace|<|\$|process\.env)[A-Za-z0-9_+/.=-]{24,}["']/i.test(text)) {
      throw new LandingError("비밀 키로 보이는 내용이 포함되었습니다: " + name);
    }
    if (/(?:eval|new\s+Function)\s*\(\s*(?:atob|Buffer\.from)\s*\(|(?:coinhive|cryptonight|stratum\+tcp):?\/\/|\b(?:curl|wget)\b[^\r\n]{0,200}\|\s*(?:bash|sh)\b/i.test(text)) {
      throw new LandingError("검토가 필요한 코드 패턴이 발견되었습니다: " + name);
    }
  }
  const checks = ["ZIP 경로·압축 크기·CRC·심볼릭 링크 검사", "지원 파일 형식·비밀 파일·키 패턴 검사", "제한된 의심 코드 패턴 검사"];
  const hasBuild = [...files.keys()].some(p => /(?:^|\/)(?:package\.json|requirements\.txt|pyproject\.toml|Cargo\.toml|go\.mod|composer\.json|Gemfile)$/i.test(p));
  let manifest: ReturnType<typeof inspectBundle> | null = null;
  let previewReason = "";
  // Only static files enter the preview manifest; source files are never served.
  const staticFiles = new Map([...files].filter(([p]) => !!MIME[extension(p)]));
  if (hasBuild) previewReason = "빌드 또는 서버 실행이 필요한 프로젝트입니다. 소스와 실행 방법을 공유하거나 외부 체험 링크를 연결해주세요.";
  else {
    try { manifest = inspectBundle(staticFiles, appOrigin); }
    catch (e) { previewReason = e instanceof LandingError ? e.message : "정적 미리보기를 구성할 수 없습니다."; }
  }
  return { files, manifest, previewReason, checks, sha256: createHash("sha256").update(bytes).digest("hex") };
}
