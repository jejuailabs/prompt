import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { HttpError } from '@/lib/auth';
import { db } from '@/lib/db';

const path = z.string().max(240).regex(/^[a-zA-Z0-9_/-]+\.(fbx|png|jpg|webp)$/).refine(v => !v.includes('..') && !v.startsWith('/'));
export const motionEntry = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,64}$/),
  name: z.string().min(1).max(100),
  category: z.enum(['Idle', 'Walk', 'Run', 'Jump', 'Attack', 'Hit', 'Death', 'Dance', 'Other']),
  file: path.refine(v => v.endsWith('.fbx')),
  thumbnail: path.optional(),
});
export const motionManifest = z.object({
  version: z.literal(1),
  motions: z.array(motionEntry).max(500),
}).refine(v => new Set(v.motions.map(m => m.id)).size === v.motions.length, 'duplicate motion id');

type MotionEntry = z.infer<typeof motionEntry>;

/**
 * Admin uploads are the live source of truth.  library.json is optional legacy
 * input, so a newly created private bucket must not hide successfully uploaded
 * rows merely because it has no manifest yet.
 */
export function mergeMotionCatalog(legacy: MotionEntry[], uploadedMetadata: unknown[]): MotionEntry[] {
  const catalog = new Map(legacy.map(motion => [motion.id, motion]));
  for (const metadata of uploadedMetadata) {
    const entry = motionEntry.safeParse(metadata);
    if (entry.success) catalog.set(entry.data.id, entry.data);
  }
  return [...catalog.values()];
}

export function motionStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError('모션 저장소 서버 설정이 필요합니다.', 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function loadMotionLibrary() {
  const client = motionStorage();
  const bucket = process.env.SUPABASE_MOTION_BUCKET || 'character-motions';
  const { data: info, error: bucketError } = await client.storage.getBucket(bucket);
  if (bucketError || !info) throw new HttpError('비공개 character-motions 버킷과 library.json을 먼저 등록해주세요.', 503);
  if (info.public) throw new HttpError('원본 모션 버킷은 비공개로 설정해야 합니다.', 503);
  const storage = client.storage.from(bucket);
  const { data, error } = await storage.download('library.json');
  // A manifest is only for legacy manual registration.  Do not reject all
  // admin-uploaded rows just because a new bucket has no legacy file.
  let legacy: MotionEntry[] = [];
  if (data) {
    if (data.size > 256 * 1024) throw new HttpError('모션 목록이 너무 큽니다.', 503);
    let json: unknown;
    try { json = JSON.parse(await data.text()); } catch { throw new HttpError('library.json 형식을 확인해주세요.', 503); }
    const parsed = motionManifest.safeParse(json);
    if (!parsed.success) throw new HttpError('library.json 형식을 확인해주세요.', 503);
    legacy = parsed.data.motions;
  } else if (error && (error as { status?: number }).status !== 404) {
    throw new HttpError('모션 목록을 읽지 못했습니다.', 503);
  }
  const rows = await db.artifact.findMany({ where: { type: 'motion_library', sourceModule: '3d-studio', status: 'done' }, select: { metadata: true }, orderBy: { createdAt: 'desc' } });
  const uploaded = rows.map(row => {
    try { return JSON.parse(row.metadata) as unknown; } catch { return null; }
  });
  return { storage, motions: mergeMotionCatalog(legacy, uploaded) };
}
