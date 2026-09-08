// POST /api/upload — image upload (png/jpeg/webp ≤ 5MB) → Vercel Blob
import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new HttpError('업로드할 파일이 없습니다', 400);
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new HttpError('PNG, JPEG, WebP 이미지만 업로드할 수 있습니다', 400);
    }
    if (file.size > MAX_SIZE) throw new HttpError('파일 크기는 5MB 이하여야 합니다', 400);

    const safeName = (file.name || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
    const pathname = `uploads/${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    return ok({ url: blob.url });
  } catch (e) {
    return fail(e);
  }
}
