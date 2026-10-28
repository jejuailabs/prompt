// POST /api/class/[code]/reference — attach one photo (camera or album) to the next prompt.
// Re-encoded like the model lab's references (EXIF rotation, metadata dropped, long edge capped).
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { uploadBuffer } from '@/lib/server/storage';
import { findSessionByCode, referenceUrl, requireOpen, requireParticipant } from '@/modules/class-studio/server';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
const MAX_SIZE = 12 * 1024 * 1024;
const MAX_EDGE = 1536;

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await findSessionByCode((await params).code);
    requireOpen(session);
    const participant = await requireParticipant(session);
    const file = (await req.formData()).get('file');
    if (!(file instanceof File)) throw new HttpError('첨부할 사진이 없어요', 400);
    if (file.type && !ALLOWED_TYPES.includes(file.type)) throw new HttpError('사진 파일(JPG, PNG, WebP)만 첨부할 수 있어요', 400);
    if (file.size > MAX_SIZE) throw new HttpError('사진이 너무 커요 (12MB 이하)', 400);

    let jpeg: Buffer;
    try {
      jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 88 })
        .toBuffer();
    } catch {
      throw new HttpError('사진을 읽을 수 없어요. 다른 사진으로 해보세요', 400);
    }

    const path = `class-ref/${session.id}/${participant.id}/${randomUUID()}.jpg`;
    await uploadBuffer(path, jpeg, 'image/jpeg');
    return ok({ path, url: referenceUrl(path) });
  } catch (e) {
    return fail(e);
  }
}
