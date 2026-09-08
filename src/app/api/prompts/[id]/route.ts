// GET /api/prompts/[id] — PromptDetailDTO (versions, artifacts, forkParent)
// PATCH /api/prompts/[id] — owner edit (title, body, category, thumbnailUrl)
// DELETE /api/prompts/[id] — owner delete
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserFast, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializePromptDetail } from '@/lib/server/serialize';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUserFast();
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
    if (prompt.status === 'hidden' && prompt.ownerId !== user?.id) {
      throw new HttpError('프롬프트를 찾을 수 없습니다', 404);
    }
    return ok(await serializePromptDetail(prompt, user?.id ?? null));
  } catch (e) {
    return fail(e);
  }
}

interface PatchBody {
  title?: string;
  body?: string;
  category?: string;
  thumbnailUrl?: string | null;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const prompt = await db.prompt.findUnique({ where: { id } });
    if (!prompt) throw new HttpError('프롬프트를 찾을 수 없습니다', 404);
    if (prompt.ownerId !== user.id && user.role !== 'admin') {
      throw new HttpError('권한이 없습니다', 403);
    }

    const input = await readJson<PatchBody>(req);
    const data: Record<string, unknown> = {};

    if (input.title !== undefined) {
      if (!input.title.trim()) throw new HttpError('제목을 입력해주세요', 400);
      data.title = input.title.trim().slice(0, 120);
    }
    if (input.body !== undefined) {
      if (!input.body.trim()) throw new HttpError('프롬프트 내용을 입력해주세요', 400);
      data.body = input.body;
    }
    if (input.category !== undefined) data.category = input.category;
    if (input.thumbnailUrl !== undefined) data.thumbnailUrl = input.thumbnailUrl;

    const updated = await db.prompt.update({
      where: { id },
      data,
      include: {
        owner: true,
        versions: { orderBy: { createdAt: 'asc' } },
        forkParent: { select: { id: true, title: true } },
        artifacts: { include: { owner: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    return ok(await serializePromptDetail(updated, user.id));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const prompt = await db.prompt.findUnique({ where: { id } });
    if (!prompt) throw new HttpError('프롬프트를 찾을 수 없습니다', 404);
    if (prompt.ownerId !== user.id && user.role !== 'admin') {
      throw new HttpError('권한이 없습니다', 403);
    }

    await db.$transaction([
      db.promptVersion.deleteMany({ where: { promptId: id } }),
      db.artifact.updateMany({ where: { sourcePromptId: id }, data: { sourcePromptId: null } }),
      db.comment.deleteMany({ where: { targetType: 'prompt', targetId: id } }),
      db.vote.deleteMany({ where: { targetType: 'prompt', targetId: id } }),
      db.prompt.delete({ where: { id } }),
    ]);

    return ok(null);
  } catch (e) {
    return fail(e);
  }
}
