import "server-only";
import { objectKey } from "./object-key";
import { db } from "@/lib/db";
import { supaAdmin } from "@/lib/supabase/admin";
import { LandingError } from "./errors";
import {
  LIMITS,
  type LandingRecord,
  type LandingRepository,
  type LandingStorage,
} from "./types";
async function ready() {
  const rows = await db.$queryRaw<
    { tableName: string | null }[]
  >`SELECT to_regclass('landing_private.pages')::text AS "tableName"`;
  if (!rows[0]?.tableName)
    throw new LandingError("랜딩페이지 비공개 DB 설정이 필요합니다.", 503);
}
const select = async (id: string) =>
  db.$queryRaw<
    LandingRecord[]
  >`SELECT id::text AS "id",owner_id::text AS "ownerId",title,description,metadata::text AS "metadata",created_at AS "createdAt" FROM landing_private.pages WHERE id=${id}::uuid`;
export const repository: LandingRepository = {
  async list(ownerId) {
    await ready();
    return db.$queryRaw<
      LandingRecord[]
    >`SELECT id::text AS "id",owner_id::text AS "ownerId",title,description,metadata::text AS "metadata",created_at AS "createdAt" FROM landing_private.pages WHERE owner_id=${ownerId}::uuid ORDER BY created_at DESC`;
  },
  async get(id) {
    if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)) return null;
    await ready();
    return (await select(id))[0] || null;
  },
  async create(r) {
    await ready();
    await db.$executeRaw`INSERT INTO landing_private.pages(id,owner_id,title,description,metadata,created_at) VALUES(${r.id}::uuid,${r.ownerId}::uuid,${r.title},${r.description},${r.metadata}::jsonb,${new Date(r.createdAt)})`;
  },
  async compareSwap(r, data) {
    return (
      (await db.$executeRaw`UPDATE landing_private.pages SET title=CASE WHEN ${data.title !== undefined} THEN ${data.title ?? ""} ELSE title END,description=CASE WHEN ${data.description !== undefined} THEN ${data.description ?? ""} ELSE description END,metadata=${data.metadata ?? r.metadata}::jsonb,updated_at=now() WHERE id=${r.id}::uuid AND owner_id=${r.ownerId}::uuid AND metadata=${r.metadata}::jsonb`) ===
      1
    );
  },
  async delete(r) {
    return (
      (await db.$executeRaw`DELETE FROM landing_private.pages WHERE id=${r.id}::uuid AND owner_id=${r.ownerId}::uuid AND metadata=${r.metadata}::jsonb`) ===
      1
    );
  },
};
export const BUCKET = "landing-pages";
export const storage: LandingStorage = {
  async check() {
    const b = await supaAdmin.storage.getBucket(BUCKET);
    if (!b.data)
      throw new LandingError(
        "랜딩페이지 전용 비공개 저장소 설정이 필요합니다.",
        503,
      );
    if (b.data.public)
      throw new LandingError(
        "랜딩페이지 저장소가 공개로 설정돼 있어 업로드를 차단했습니다.",
        503,
      );
    if (Number(b.data.file_size_limit) !== LIMITS.zipBytes)
      throw new LandingError(
        "랜딩페이지 저장소의 파일 제한을 50MB로 설정해주세요.",
        503,
      );
  },
  async signedUpload(path) {
    const { data, error } = await supaAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !data)
      throw new LandingError("직접 업로드 권한을 발급하지 못했습니다.", 503);
    const host = new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
    ).hostname.replace(".supabase.co", ".storage.supabase.co");
    return {
      bucket: BUCKET,
      path,
      token: data.token,
      endpoint: "https://" + host + "/storage/v1/upload/resumable/sign",
      publicKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };
  },
  async read(path, maxBytes) {
    let signed = await supaAdmin.storage
      .from(BUCKET)
      .createSignedUrl(objectKey(path), 60);
    // Read versions saved before the provider-key mapping was introduced.
    if (signed.error && objectKey(path) !== path) signed = await supaAdmin.storage.from(BUCKET).createSignedUrl(path, 60);
    if (signed.error || !signed.data)
      throw new LandingError("저장된 파일을 읽을 수 없습니다.", 503);
    const r = await fetch(signed.data.signedUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok || !r.body)
      throw new LandingError("저장된 파일을 읽을 수 없습니다.", 503);
    if (Number(r.headers.get("content-length")) > maxBytes) {
      await r.body.cancel();
      throw new LandingError("저장 파일이 허용 용량을 초과했습니다.", 413);
    }
    const reader = r.body.getReader(),
      chunks: Uint8Array[] = [];
    let n = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        n += value.length;
        if (n > maxBytes) {
          await reader.cancel();
          throw new LandingError("저장 파일이 허용 용량을 초과했습니다.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return Buffer.concat(chunks);
  },
  async put(path, data, contentType) {
    const r = await supaAdmin.storage
      .from(BUCKET)
      .upload(objectKey(path), data, { contentType, upsert: false, cacheControl: "0" });
    if (r.error)
      throw new LandingError("압축 파일의 리소스를 저장하지 못했습니다.", 503);
  },
  async remove(paths) {
    paths = [...new Set(paths.flatMap(path => { const key = objectKey(path); return key === path ? [path] : /^[\x20-\x7e]+$/.test(path) ? [key, path] : [key]; }))];
    for (let at = 0; at < paths.length; at += 100) {
      const r = await supaAdmin.storage
        .from(BUCKET)
        .remove(paths.slice(at, at + 100));
      if (r.error)
        throw new LandingError("저장소 파일을 삭제하지 못했습니다.", 503);
    }
  },
};
