import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { ok, fail, readJson } from '@/lib/server/handler';
import { motionStorage } from '@/lib/server/motion-library';
import { motionUploadSchema, looksLikeFbx } from '@/lib/motion-upload';

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = motionUploadSchema.safeParse(await readJson(req));
    if (!parsed.success) throw new HttpError('FBX 파일명·크기(28MB 이하)·카테고리를 확인해주세요.', 400);
    const body = parsed.data;
    const bucket = process.env.SUPABASE_MOTION_BUCKET || 'character-motions';
    const client = motionStorage();
    const info = await client.storage.getBucket(bucket);
    if (info.error || info.data?.public !== false) throw new HttpError('비공개 모션 버킷 설정을 확인해주세요.', 503);
    const file = `fbx/${body.hash}.fbx`;
    const existing = await db.artifact.findUnique({ where: { id: body.hash } });
    if (existing && existing.type !== 'motion_library') throw new HttpError('파일 식별자가 충돌했습니다.', 409);
    if (existing?.status === 'done') return ok({ complete: true });
    await db.artifact.upsert({ where: { id: body.hash }, update: {}, create: {
      id: body.hash, ownerId: admin.id, type: 'motion_library', sourceModule: '3d-studio', visibility: 'private', status: 'uploading', title: body.name.replace(/\.fbx$/i, '').slice(0, 100),
      metadata: JSON.stringify({ id: body.hash, name: body.name.replace(/\.fbx$/i, '').slice(0, 100), category: body.category, file, size: body.size }),
    } });
    const storage = client.storage.from(bucket);
    const found = await storage.info(file);
    if (found.data) return ok({ complete: false, uploaded: true, bucket, path: file });
    const signed = await storage.createSignedUploadUrl(file, { upsert: false });
    if (signed.error || !signed.data) throw new HttpError('업로드 권한 발급 실패. 다시 시도해주세요.', 502);
    return ok({ complete: false, uploaded: false, bucket, path: file, token: signed.data.token });
  } catch (error) { return fail(error); }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { hash } = await readJson<{ hash?: string }>(req);
    if (!hash || !/^[a-f0-9]{64}$/.test(hash)) throw new HttpError('잘못된 파일 식별자입니다.', 400);
    const row = await db.artifact.findFirst({ where: { id: hash, type: 'motion_library' } });
    if (!row) throw new HttpError('업로드 접수를 찾을 수 없습니다.', 404);
    if (row.status === 'done') return ok({ complete: true });
    const meta = JSON.parse(row.metadata);
    const storage = motionStorage().storage.from(process.env.SUPABASE_MOTION_BUCKET || 'character-motions');
    const info = await storage.info(meta.file);
    if (info.error || info.data?.size !== meta.size || meta.size > 28_000_000) throw new HttpError('업로드된 파일 크기가 일치하지 않습니다.', 400);
    const result = await storage.download(meta.file);
    if (result.error || !result.data) throw new HttpError('업로드 결과를 확인하지 못했습니다.', 502);
    const bytes = Buffer.from(await result.data.arrayBuffer());
    if (!looksLikeFbx(bytes) || createHash('sha256').update(bytes).digest('hex') !== hash) throw new HttpError('FBX 형식 또는 파일 무결성 검증에 실패했습니다.', 400);
    await db.artifact.update({ where: { id: hash }, data: { status: 'done' } });
    return ok({ complete: true });
  } catch (error) { return fail(error); }
}
