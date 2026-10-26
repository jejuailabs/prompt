// POST /api/lab/reference — reference image upload for the model lab (selfie, product shot, ...)
// The image is re-encoded (EXIF rotation applied, metadata dropped, long edge capped) and stored under a
// per-user, unguessable path. Only the storage path is returned; the client previews from its local file.
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { HttpError, requireApiUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { uploadBuffer } from '@/lib/server/storage';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 8 * 1024 * 1024;
const MAX_EDGE = 1536;

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new HttpError('업로드할 파일이 없습니다', 400);
    if (!ALLOWED_TYPES.includes(file.type)) throw new HttpError('PNG, JPEG, WebP 이미지만 업로드할 수 있습니다', 400);
    if (file.size > MAX_SIZE) throw new HttpError('파일 크기는 8MB 이하여야 합니다', 400);

    let jpeg: Buffer;
    try {
      jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch {
      throw new HttpError('이미지를 읽을 수 없습니다', 400);
    }

    const path = `lab-ref/${user.id}/${randomUUID()}.jpg`;
    await uploadBuffer(path, jpeg, 'image/jpeg');
    return ok({ path });
  } catch (e) {
    return fail(e);
  }
}
