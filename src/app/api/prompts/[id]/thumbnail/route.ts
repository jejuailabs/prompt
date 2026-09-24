// POST /api/prompts/[id]/thumbnail — atomically attach a prompt thumbnail
//
// A prompt image is both the card thumbnail and a linked gallery artifact.
// Keeping those records in the same request prevents edit-time uploads from
// disappearing from the prompt gallery while the detail view looks correct.
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { uploadBuffer } from '@/lib/server/storage';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const prompt = await db.prompt.findUnique({ where: { id } });
    if (!prompt) throw new HttpError('프롬프트를 찾을 수 없습니다', 404);
    if (prompt.ownerId !== user.id && user.role !== 'admin') throw new HttpError('권한이 없습니다', 403);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new HttpError('업로드할 이미지가 없습니다', 400);
    if (!ALLOWED_TYPES.includes(file.type)) throw new HttpError('PNG, JPEG, WebP 이미지만 업로드할 수 있습니다', 400);
    if (file.size > MAX_SIZE) throw new HttpError('파일 크기는 5MB 이하여야 합니다', 400);

    const safeName = (file.name || 'thumbnail.png').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
    const path = `prompts/${id}/${Date.now()}-${safeName}`;
    const thumbnailUrl = await uploadBuffer(path, Buffer.from(await file.arrayBuffer()), file.type);

    await db.$transaction(async (tx) => {
      await tx.prompt.update({ where: { id }, data: { thumbnailUrl } });

      // Initial prompt creation already creates an image artifact. For a later
      // edit, update it instead of making duplicate gallery entries.
      const existing = await tx.artifact.findFirst({
        where: { sourcePromptId: id, type: 'image', sourceModule: 'prompt-wiki' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      const artifactData = {
        title: prompt.title,
        type: 'image',
        fileUrl: thumbnailUrl,
        sourcePromptId: id,
        sourceModule: 'prompt-wiki',
        visibility: 'public',
        status: 'published',
      } as const;
      if (existing) await tx.artifact.update({ where: { id: existing.id }, data: artifactData });
      else await tx.artifact.create({ data: { ownerId: prompt.ownerId, ...artifactData } });
    });

    return ok({ thumbnailUrl });
  } catch (error) {
    return fail(error);
  }
}
