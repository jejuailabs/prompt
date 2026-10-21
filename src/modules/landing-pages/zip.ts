import { inflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";
import { LandingError } from "./errors";
import { LIMITS } from "./types";

export const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
};
export const extension = (path: string) => path.split(".").pop()!.toLowerCase();
export function safePath(path: string) {
  if (
    !path ||
    path.length > 500 ||
    Buffer.byteLength(path, "utf8") > 800 ||
    /^[\/\\]|\\|[:\x00-\x1f\x7f]/.test(path) ||
    path.split("/").some((s) => !s || s === "." || s === "..")
  )
    throw new LandingError("안전하지 않은 파일 경로: " + path);
  return path;
}
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc(bytes: Uint8Array) {
  let n = 0xffffffff;
  for (const b of bytes) n = table[(n ^ b) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
}
// Source archives use the same bounded ZIP parser, with their own file policy.
// The default policy remains unchanged for private landing pages.
export function unpackZip(input: Uint8Array, limits: typeof LIMITS = LIMITS, sourcePolicy?: (path: string, folder: boolean) => void) {
  const b = Buffer.from(input);
  if (b.length > limits.zipBytes)
    throw new LandingError("ZIP은 50MB 이하만 지원합니다.", 413);
  if (b.length < 22) throw new LandingError("유효한 ZIP 파일이 아닙니다.");
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--)
    if (
      b.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + b.readUInt16LE(i + 20) === b.length
    ) {
      end = i;
      break;
    }
  if (end < 0) throw new LandingError("ZIP 끝 정보가 손상되었습니다.");
  const count = b.readUInt16LE(end + 10),
    start = b.readUInt32LE(end + 16),
    centralSize = b.readUInt32LE(end + 12);
  if (
    b.readUInt16LE(end + 4) ||
    b.readUInt16LE(end + 6) ||
    b.readUInt16LE(end + 8) !== count ||
    count === 65535 ||
    start === 0xffffffff ||
    start + centralSize !== end
  )
    throw new LandingError("분할 ZIP과 ZIP64는 지원하지 않습니다.");
  if (count > limits.files * 2)
    throw new LandingError("파일 수 제한을 초과했습니다.", 413);
  const decoder = new TextDecoder("utf-8", { fatal: true }),
    names = new Set<string>(),
    items: {
      name: string;
      flags: number;
      method: number;
      size: number;
      compressed: number;
      checksum: number;
      offset: number;
      rawName: Buffer;
    }[] = [];
  let at = start,
    total = 0;
  try {
    for (let i = 0; i < count; i++) {
      if (at + 46 > end || b.readUInt32LE(at) !== 0x02014b50)
        throw new LandingError("ZIP 파일 목록이 손상되었습니다.");
      const flags = b.readUInt16LE(at + 8),
        method = b.readUInt16LE(at + 10),
        compressed = b.readUInt32LE(at + 20),
        size = b.readUInt32LE(at + 24),
        nl = b.readUInt16LE(at + 28),
        el = b.readUInt16LE(at + 30),
        cl = b.readUInt16LE(at + 32),
        attr = b.readUInt32LE(at + 38),
        offset = b.readUInt32LE(at + 42);
      if (at + 46 + nl + el + cl > end)
        throw new LandingError("ZIP 경계가 손상되었습니다.");
      const rawName = b.subarray(at + 46, at + 46 + nl),
        extra = b.subarray(at + 46 + nl, at + 46 + nl + el);
      let name: string;
      try {
        name = decoder.decode(rawName);
      } catch {
        if (flags & 2048)
          throw new LandingError("UTF-8 ZIP 파일명이 손상되었습니다.");
        try {
          name = new TextDecoder("euc-kr", { fatal: true }).decode(rawName);
        } catch {
          throw new LandingError(
            "지원하지 않는 ZIP 파일명 인코딩입니다. UTF-8 또는 Windows 한글 ZIP을 사용해주세요.",
          );
        }
      }
      for (let x = 0; x + 4 <= extra.length; ) {
        const kind = extra.readUInt16LE(x),
          len = extra.readUInt16LE(x + 2);
        if (x + 4 + len > extra.length)
          throw new LandingError("ZIP 확장 정보가 손상되었습니다.");
        if (kind === 0x7075 && len >= 5 && extra[x + 4] === 1) {
          if (extra.readUInt32LE(x + 5) !== crc(rawName))
            throw new LandingError("ZIP Unicode 파일명 검증 실패.");
          name = decoder.decode(extra.subarray(x + 9, x + 4 + len));
        }
        x += 4 + len;
      }
      at += 46 + nl + el + cl;
      if (flags & 1 || flags & 64)
        throw new LandingError("암호화된 ZIP은 지원하지 않습니다.");
      if (((attr >>> 16) & 0xf000) === 0xa000)
        throw new LandingError("심볼릭 링크는 업로드할 수 없습니다: " + name);
      const folder = name.endsWith("/");
      if (folder) name = name.slice(0, -1);
      safePath(name);
      if (sourcePolicy) sourcePolicy(name, folder);
      if (!sourcePolicy && (
        name
          .split("/")
          .some(
            (p) =>
              p.startsWith(".") || ["node_modules", "__MACOSX"].includes(p),
          ) ||
        /(?:^|\/)(?:package(?:-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|.*\.pem|.*\.key|.*\.env(?:\..*)?|Dockerfile|Thumbs\.db)$/i.test(
          name,
        )
      ))
        throw new LandingError(
          "비밀 설정·빌드 파일은 지원하지 않습니다: " + name,
        );
      const identity = name.normalize("NFC").toLowerCase();
      if (names.has(identity))
        throw new LandingError("중복되거나 충돌하는 파일명: " + name);
      names.add(identity);
      if (folder) {
        if (size) throw new LandingError("잘못된 폴더 항목: " + name);
        continue;
      }
      if (!sourcePolicy && !MIME[extension(name)])
        throw new LandingError(
          "지원하지 않는 파일입니다. 서버 코드·중첩 압축·빌드 파일은 제외해주세요: " +
            name,
        );
      if (method !== 0 && method !== 8)
        throw new LandingError("지원하지 않는 ZIP 압축 방식: " + name);
      if (
        size > limits.fileBytes ||
        total + size > limits.totalBytes ||
        items.length >= limits.files
      )
        throw new LandingError(
          "압축 해제 용량·개별 파일 크기·파일 수 제한을 초과했습니다: " + name,
          413,
        );
      if (size > 1024 * 1024 && size / Math.max(1, compressed) > limits.ratio)
        throw new LandingError("압축 비율이 지나치게 높습니다: " + name, 413);
      if (
        ["html", "htm", "css", "js", "mjs", "json", "svg"].includes(
          extension(name),
        ) &&
        size > limits.textBytes
      )
        throw new LandingError(
          "HTML·CSS·JS·텍스트 파일은 각각 2MB 이하만 지원합니다: " + name,
          413,
        );
      total += size;
      items.push({
        name,
        flags,
        method,
        size,
        compressed,
        checksum: b.readUInt32LE(at - (46 + nl + el + cl) + 16),
        offset,
        rawName,
      });
    }
    if (at !== end)
      throw new LandingError("ZIP 파일 목록 크기가 맞지 않습니다.");
    const files = new Map<string, Buffer>();
    for (const x of items) {
      const p = x.offset;
      if (p + 30 > start || b.readUInt32LE(p) !== 0x04034b50)
        throw new LandingError("파일 헤더가 손상되었습니다: " + x.name);
      const nl = b.readUInt16LE(p + 26),
        el = b.readUInt16LE(p + 28),
        dataAt = p + 30 + nl + el;
      if (
        b.readUInt16LE(p + 6) !== x.flags ||
        b.readUInt16LE(p + 8) !== x.method ||
        !b.subarray(p + 30, p + 30 + nl).equals(x.rawName) ||
        dataAt + x.compressed > start
      )
        throw new LandingError(
          "ZIP의 파일 경로·데이터 경계가 맞지 않습니다: " + x.name,
        );
      let bytes: Buffer;
      try {
        bytes =
          x.method === 0
            ? Buffer.from(b.subarray(dataAt, dataAt + x.compressed))
            : inflateRawSync(b.subarray(dataAt, dataAt + x.compressed), {
                maxOutputLength: Math.min(limits.fileBytes, x.size || 1),
              });
      } catch {
        throw new LandingError(
          "파일 압축이 손상되었거나 허용 용량을 초과했습니다: " + x.name,
        );
      }
      if (bytes.length !== x.size || crc(bytes) !== x.checksum)
        throw new LandingError("파일 크기 또는 CRC 검증 실패: " + x.name);
      if (bytes.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])))
        throw new LandingError("파일 안에 중첩 압축이 있습니다: " + x.name);
      if (
        ["html", "htm", "css", "js", "mjs", "json", "svg"].includes(
          extension(x.name),
        )
      ) {
        let text: string;
        try {
          text = decoder.decode(bytes);
        } catch {
          throw new LandingError(
            "텍스트 파일은 UTF-8로 저장해주세요: " + x.name,
          );
        }
        if (
          /sk-(?:proj-)?[A-Za-z0-9_-]{32,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
            text,
          )
        )
          throw new LandingError(
            "비밀 키로 보이는 내용이 포함되었습니다: " + x.name,
          );
      }
      files.set(x.name, bytes);
    }
    if (!files.size) throw new LandingError("ZIP에 사용할 파일이 없습니다.");
    return files;
  } catch (e) {
    if (e instanceof LandingError) throw e;
    throw new LandingError("ZIP 형식이나 UTF-8 파일명이 올바르지 않습니다.");
  }
}
export function fileInfo(path: string, data: Buffer) {
  return {
    path,
    bytes: data.length,
    contentType: MIME[extension(path)],
    sha256: createHash("sha256").update(data).digest("hex"),
  };
}
export function findEntry(files: Map<string, Buffer>) {
  if (files.has("index.html")) return { entry: "index.html", siteRoot: "" };
  const entries = [...files.keys()].filter((p) =>
    /^[^/]+\/index\.html$/.test(p),
  );
  if (entries.length !== 1)
    throw new LandingError(
      entries.length
        ? "여러 폴더에 index.html이 있습니다. 진입점을 하나만 남겨주세요."
        : "ZIP 최상위 또는 폴더 한 단계 안에 index.html이 필요합니다.",
    );
  return { entry: entries[0], siteRoot: entries[0].split("/")[0] + "/" };
}
