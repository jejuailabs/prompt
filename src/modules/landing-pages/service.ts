import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { LandingError } from "./errors";
import {
  LIMITS,
  uploadExpired,
  type LandingDTO,
  type LandingMetadata,
  type LandingRecord,
  type LandingRepository,
  type LandingSession,
  type LandingStorage,
  type LandingVersion,
} from "./types";
import { unpackZip, safePath } from "./zip";
import { inspectBundle, renderFile } from "./resources";
import { isolatedOrigins } from "./origins";
export function metadata(record: LandingRecord): LandingMetadata {
  try {
    const m = JSON.parse(record.metadata);
    if (
      m.schema !== 1 ||
      !Array.isArray(m.versions) ||
      !Array.isArray(m.sessions)
    )
      throw Error();
    return m;
  } catch {
    throw new LandingError("랜딩페이지 저장 정보가 올바르지 않습니다.", 500);
  }
}
export function dto(r: LandingRecord): LandingDTO {
  const m = metadata(r);
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    createdAt: new Date(r.createdAt).toISOString(),
    status: m.deleting
      ? "deleting"
      : m.upload &&
          ["uploading", "processing"].includes(m.upload.state) &&
          uploadExpired(m.upload)
        ? "failed"
        : m.upload?.state || "ready",
    error:
      m.upload?.error ||
      (m.upload &&
      ["uploading", "processing"].includes(m.upload.state) &&
      uploadExpired(m.upload)
        ? "업로드·검증 시간이 지나 작업이 중단되었습니다. ZIP을 다시 교체하거나 삭제할 수 있습니다."
        : null),
    hasPreview: !!m.active && !m.deleting,
    version: m.active?.id || null,
    fileCount: m.active?.manifest.files.length || 0,
    bytes: m.active?.manifest.totalBytes || 0,
    warnings: m.active?.manifest.warnings || [],
  };
}
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function text(value: unknown, max: number, required = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new LandingError(
      required
        ? "제목을 1~120자로 입력해주세요."
        : "설명은 2,000자 이하로 입력해주세요.",
    );
  return value.trim();
}
export class LandingService {
  constructor(
    public repo: LandingRepository,
    public storage: LandingStorage,
    public config: { appOrigin: string; previewOrigin: string; secret: string },
  ) {}
  async owned(id: string, owner: string) {
    const r = await this.repo.get(id);
    if (!r || r.ownerId !== owner)
      throw new LandingError("랜딩페이지를 찾을 수 없습니다.", 404);
    return r;
  }
  async swap(
    r: LandingRecord,
    m: LandingMetadata,
    extra: Partial<LandingRecord> = {},
  ) {
    if (
      !(await this.repo.compareSwap(r, {
        metadata: JSON.stringify(m),
        ...extra,
      }))
    )
      throw new LandingError(
        "다른 작업이 진행됐습니다. 목록을 새로고침한 뒤 다시 시도해주세요.",
        409,
      );
  }
  async list(owner: string) {
    return (await this.repo.list(owner)).map(dto);
  }
  async begin(
    owner: string,
    input: {
      id?: string;
      title?: unknown;
      description?: unknown;
      fileName?: unknown;
      size?: unknown;
    },
  ) {
    if (
      typeof input.fileName !== "string" ||
      input.fileName.length > 255 ||
      !input.fileName.toLowerCase().endsWith(".zip")
    )
      throw new LandingError("ZIP 파일 하나를 선택해주세요.");
    if (
      !Number.isInteger(input.size) ||
      Number(input.size) < 22 ||
      Number(input.size) > LIMITS.zipBytes
    )
      throw new LandingError("ZIP은 50MB 이하만 지원합니다.", 413);
    await this.storage.check();
    let r: LandingRecord, m: LandingMetadata;
    if (input.id) {
      r = await this.owned(input.id, owner);
      m = metadata(r);
      if (m.deleting) throw new LandingError("삭제 중인 페이지입니다.", 409);
      if (
        m.upload &&
        ["uploading", "processing"].includes(m.upload.state) &&
        !uploadExpired(m.upload)
      )
        throw new LandingError(
          "이미 업로드·검증이 진행 중입니다. 먼저 취소해주세요.",
          409,
        );
    } else {
      r = {
        id: randomUUID(),
        ownerId: owner,
        title: text(input.title, 120, true),
        description: text(input.description ?? "", 2000),
        metadata: "",
        createdAt: new Date(),
      };
      m = { schema: 1, active: null, upload: null, versions: [], sessions: [] };
    }
    const versionId = randomUUID(),
      prefix = owner + "/" + r.id + "/" + versionId,
      zipPath = prefix + "/upload.zip",
      destination = await this.storage.signedUpload(zipPath);
    if (m.upload && m.upload.state !== "ready") {
      const old = m.upload;
      await this.storage.remove([
        old.zipPath,
        ...(old.files || []).map((f) => old.prefix + "/files/" + f.path),
      ]);
    }
    m.upload = {
      id: versionId,
      prefix,
      zipPath,
      size: Number(input.size),
      fileName: input.fileName,
      state: "uploading",
      startedAt: new Date().toISOString(),
    };
    if (input.id) await this.swap(r, m);
    else {
      r.metadata = JSON.stringify(m);
      await this.repo.create(r);
    }
    return { id: r.id, versionId, ...destination };
  }
  async complete(owner: string, id: string, versionId: string) {
    let r = await this.owned(id, owner),
      m = metadata(r),
      upload = m.upload;
    if (upload?.id === versionId && upload.state === "ready") return dto(r);
    if (
      !upload ||
      upload.id !== versionId ||
      upload.state !== "uploading" ||
      m.deleting
    )
      throw new LandingError(
        "유효한 업로드가 아니거나 이미 처리 중입니다.",
        409,
      );
    upload.state = "processing";
    upload.startedAt = new Date().toISOString();
    await this.swap(r, m);
    try {
      const bytes = await this.storage.read(upload.zipPath, LIMITS.zipBytes);
      if (bytes.length !== upload.size)
        throw new LandingError(
          "선택한 ZIP 크기와 저장된 파일 크기가 다릅니다. 다시 업로드해주세요.",
        );
      const files = unpackZip(bytes),
        manifest = inspectBundle(files, this.config.appOrigin);
      r = await this.owned(id, owner);
      m = metadata(r);
      if (m.upload?.id !== versionId || m.deleting)
        throw new LandingError("업로드 작업이 취소되었습니다.", 409);
      m.upload.files = manifest.files;
      await this.swap(r, m);
      const entries = [...files];
      let index = 0;
      const writes = await Promise.allSettled(
        Array.from({ length: Math.min(4, entries.length) }, async () => {
          while (index < entries.length) {
            const [file, data] = entries[index++];
            await this.storage.put(
              upload!.prefix + "/files/" + file,
              data,
              manifest.files.find((f) => f.path === file)!.contentType,
            );
          }
        }),
      );
      const failed = writes.find((r) => r.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      r = await this.owned(id, owner);
      m = metadata(r);
      if (m.upload?.id !== versionId || m.deleting)
        throw new LandingError("업로드 작업이 취소되었습니다.", 409);
      const active: LandingVersion = {
        id: versionId,
        prefix: upload.prefix,
        zipPath: upload.zipPath,
        manifest,
        createdAt: new Date().toISOString(),
      };
      m.active = active;
      m.versions.push(active);
      m.upload.state = "ready";
      delete m.upload.error;
      m.sessions = [];
      await this.swap(r, m);
      return dto(await this.owned(id, owner));
    } catch (e) {
      const latest = await this.repo.get(id);
      if (latest && latest.ownerId === owner) {
        const next = metadata(latest);
        if (next.upload?.id === versionId && !next.deleting) {
          next.upload.state = "failed";
          next.upload.error =
            e instanceof LandingError
              ? e.message
              : "파일 검증·객체 저장 중 오류가 발생했습니다. 기존 버전은 유지됩니다.";
          await this.swap(latest, next).catch(() => {});
        }
      }
      if (e instanceof LandingError) throw e;
      throw new LandingError(
        "파일 저장에 실패했습니다. 기존 미리보기는 유지됩니다.",
        503,
      );
    }
  }
  async cancel(owner: string, id: string, versionId: string) {
    const r = await this.owned(id, owner),
      m = metadata(r);
    if (m.upload?.id !== versionId || m.upload.state === "ready")
      throw new LandingError("취소할 업로드가 없습니다.", 409);
    if (m.upload.state === "processing" && !uploadExpired(m.upload))
      throw new LandingError(
        "검증 중에는 취소할 수 없습니다. 완료 후 삭제해주세요.",
        409,
      );
    await this.storage.remove([
      m.upload.zipPath,
      ...(m.upload.files || []).map(
        (f) => m.upload!.prefix + "/files/" + f.path,
      ),
    ]);
    m.upload.state = "failed";
    m.upload.error = "업로드가 취소되었습니다. ZIP을 다시 선택해주세요.";
    await this.swap(r, m);
  }
  async edit(
    owner: string,
    id: string,
    input: { title?: unknown; description?: unknown },
  ) {
    const r = await this.owned(id, owner),
      m = metadata(r);
    if (m.deleting) throw new LandingError("삭제 중인 페이지입니다.", 409);
    await this.swap(r, m, {
      title: text(input.title, 120, true),
      description: text(input.description ?? "", 2000),
    });
    return dto(await this.owned(id, owner));
  }
  async remove(owner: string, id: string) {
    let r = await this.owned(id, owner),
      m = metadata(r);
    if (m.upload?.state === "processing" && !uploadExpired(m.upload))
      throw new LandingError(
        "파일 검증 중에는 삭제할 수 없습니다. 완료 후 다시 시도해주세요.",
        409,
      );
    m.deleting = true;
    m.sessions = [];
    await this.swap(r, m);
    const keys = m.versions.flatMap((v) => [
      v.zipPath,
      ...v.manifest.files.map((f) => v.prefix + "/files/" + f.path),
    ]);
    if (m.upload)
      keys.push(
        m.upload.zipPath,
        ...(m.upload.files || []).map(
          (f) => m.upload!.prefix + "/files/" + f.path,
        ),
      );
    try {
      await this.storage.remove([...new Set(keys)]);
    } catch {
      throw new LandingError(
        "저장소 파일 삭제에 실패했습니다. 페이지는 차단됐으며 삭제를 다시 시도할 수 있습니다.",
        503,
      );
    }
    r = await this.owned(id, owner);
    if (!(await this.repo.delete(r)))
      throw new LandingError(
        "삭제 상태가 변경되었습니다. 다시 시도해주세요.",
        409,
      );
  }
  async open(owner: string, id: string) {
    isolatedOrigins(this.config.appOrigin, this.config.previewOrigin);
    if (Buffer.byteLength(this.config.secret) < 32)
      throw new LandingError("미리보기 서명 키 설정이 필요합니다.", 503);
    await this.storage.check();
    const r = await this.owned(id, owner),
      m = metadata(r);
    if (!m.active || m.deleting)
      throw new LandingError("검증된 미리보기 파일이 없습니다.", 409);
    const session: LandingSession = {
        id: randomUUID(),
        hash: "",
        versionId: m.active.id,
        expiresAt: Date.now() + 30 * 60_000,
      },
      payload = Buffer.from(
        JSON.stringify({
          id,
          sessionId: session.id,
          versionId: session.versionId,
          expiresAt: session.expiresAt,
          nonce: randomUUID(),
        }),
      ).toString("base64url"),
      signature = createHmac("sha256", this.config.secret)
        .update(payload)
        .digest("base64url"),
      token = payload + "." + signature;
    session.hash = hash(token);
    m.sessions = m.sessions.filter((s) => s.expiresAt > Date.now()).slice(-9);
    m.sessions.push(session);
    await this.swap(r, m);
    const prefix = this.config.previewOrigin + "/landing-preview/" + token,
      entry = m.active.manifest.entry
        .slice(m.active.manifest.siteRoot.length)
        .split("/")
        .map(encodeURIComponent)
        .join("/");
    return {
      sessionId: session.id,
      url: prefix + "/" + entry,
      expiresAt: session.expiresAt,
    };
  }
  async close(owner: string, id: string, sessionId: string) {
    const r = await this.owned(id, owner),
      m = metadata(r);
    m.sessions = m.sessions.filter((s) => s.id !== sessionId);
    await this.swap(r, m);
  }
  async serve(
    token: string,
    logicalPath: string,
    requestOrigin: string,
    range?: string | null,
  ) {
    if (requestOrigin !== new URL(this.config.previewOrigin).origin)
      throw new LandingError(
        "앱 출처에서는 업로드 페이지를 실행할 수 없습니다.",
        403,
      );
    if (token.length > 1500 || Buffer.byteLength(this.config.secret) < 32)
      throw new LandingError("유효하지 않은 미리보기입니다.", 403);
    const [payload, signature, ...extra] = token.split(".");
    if (!payload || !signature || extra.length)
      throw new LandingError("유효하지 않은 미리보기입니다.", 403);
    const expected = createHmac("sha256", this.config.secret)
        .update(payload)
        .digest(),
      actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw new LandingError("유효하지 않은 미리보기입니다.", 403);
    let claim: any;
    try {
      claim = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      throw new LandingError("유효하지 않은 미리보기입니다.", 403);
    }
    if (
      typeof claim.id !== "string" ||
      typeof claim.sessionId !== "string" ||
      claim.expiresAt <= Date.now()
    )
      throw new LandingError(
        "미리보기 권한이 만료되었습니다. 모달을 다시 열어주세요.",
        403,
      );
    const r = await this.repo.get(claim.id);
    if (!r) throw new LandingError("삭제된 미리보기입니다.", 404);
    const m = metadata(r),
      session = m.sessions.find(
        (s) => s.id === claim.sessionId && s.hash === hash(token),
      );
    if (
      !m.active ||
      m.deleting ||
      !session ||
      session.expiresAt <= Date.now() ||
      m.active?.id !== claim.versionId ||
      session.versionId !== claim.versionId
    )
      throw new LandingError("종료되었거나 교체된 미리보기입니다.", 403);
    logicalPath = logicalPath || "index.html";
    safePath(logicalPath);
    let path = m.active.manifest.siteRoot + logicalPath;
    let info = m.active.manifest.files.find((f) => f.path === path);
    if (!info) {
      path = path.replace(/\/$/, "") + "/index.html";
      info = m.active.manifest.files.find((f) => f.path === path);
    }
    if (!info)
      throw new LandingError(
        "미리보기 파일을 찾을 수 없습니다: " + logicalPath,
        404,
      );
    const bytes = await this.storage.read(
      m.active.prefix + "/files/" + path,
      LIMITS.fileBytes,
    );
    if (
      bytes.length !== info.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== info.sha256
    )
      throw new LandingError("저장된 파일 무결성 검사에 실패했습니다.", 500);
    const prefix = this.config.previewOrigin + "/landing-preview/" + token,
      body = renderFile(path, bytes, m.active.manifest, prefix, session.id),
      origins = m.active.manifest.externalOrigins.join(" ");
    let output = body,
      status = 200;
    const rangeHeaders: Record<string, string> = {};
    if (/^(video|audio)\//.test(info.contentType)) {
      rangeHeaders["Accept-Ranges"] = "bytes";
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2]))
          throw new LandingError("지원하지 않는 미디어 범위입니다.", 416);
        const start = match[1]
            ? Number(match[1])
            : Math.max(0, body.length - Number(match[2])),
          end = match[1]
            ? match[2]
              ? Math.min(Number(match[2]), body.length - 1)
              : body.length - 1
            : body.length - 1;
        if (start < 0 || start >= body.length || end < start)
          throw new LandingError("잘못된 미디어 범위입니다.", 416);
        output = body.subarray(start, end + 1);
        status = 206;
        rangeHeaders["Content-Range"] =
          "bytes " + start + "-" + end + "/" + body.length;
      }
    }
    return {
      body: output,
      status,
      headers: {
        ...rangeHeaders,
        "Content-Length": String(output.length),
        "Content-Type": info.contentType,
        "Content-Security-Policy": `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${this.config.previewOrigin} ${origins}; style-src 'unsafe-inline' ${this.config.previewOrigin} ${origins}; img-src data: blob: ${this.config.previewOrigin} ${origins}; font-src data: ${this.config.previewOrigin} ${origins}; media-src blob: ${this.config.previewOrigin} ${origins}; connect-src ${this.config.previewOrigin} ${origins}; base-uri ${this.config.previewOrigin}; frame-src 'none'; worker-src 'none'; object-src 'none'; form-action 'none'; frame-ancestors ${this.config.appOrigin}; sandbox allow-scripts allow-forms`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
        "Timing-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Permissions-Policy":
          "camera=(), microphone=(), geolocation=(), payment=()",
      },
    };
  }
}
