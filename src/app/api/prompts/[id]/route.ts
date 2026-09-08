// GET /api/prompts/[id] — PromptDetailDTO (versions, artifacts, forkParent)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializePromptDetail } from '@/lib/server/serialize';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    const prompt = await db.prompt.findUnique({
      where: { id },
      include: {
        owner: true,
        versions: { orderBy: { createdAt: 'asc' } },
        forkParent: { select: { id: true, title: true } },
        artifacts: { include: { owner: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!prompt) throw new HttpError('프롬프트를 찾을 수 없습니다', 404);
    // Hidden prompts are only visible to their owner
    if (prompt.status === 'hidden' && prompt.ownerId !== user?.id) {
      throw new HttpError('프롬프트를 찾을 수 없습니다', 404);
    }
    return ok(await serializePromptDetail(prompt, user?.id ?? null));
  } catch (e) {
    return fail(e);
  }
}
