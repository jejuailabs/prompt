// POST /api/prompts/[id]/fork — create a forked copy (+ PromptVersion row)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializePromptSingle } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';

type RouteParams = { params: Promise<{ id: string }> };

interface ForkBody {
  title?: string;
  body?: string;
  versionNote?: string;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const parent = await db.prompt.findUnique({ where: { id } });
    if (!parent) throw new HttpError('원본 프롬프트를 찾을 수 없습니다', 404);

    const body = await readJson<ForkBody>(req).catch(() => ({}) as ForkBody);
    const fork = await db.prompt.create({
      data: {
        ownerId: user.id,
        title: (body.title?.trim() || `${parent.title} (포크)`).slice(0, 120),
        body: body.body?.trim() || parent.body,
        category: parent.category,
        modelTags: parent.modelTags,
        thumbnailUrl: parent.thumbnailUrl,
        forkedFromId: parent.id,
        status: 'active',
        visibility: 'public',
      },
      include: { owner: true },
    });

    await db.promptVersion.create({
      data: {
        promptId: fork.id,
        body: fork.body,
        versionNote: body.versionNote?.trim() || `포크: ${parent.title}`,
        createdBy: user.id,
      },
    });

    // Increment parent's forkCount
    await db.prompt.update({ where: { id: parent.id }, data: { forkCount: { increment: 1 } } });

    await logEvent('prompt.forked', {
      promptId: fork.id,
      forkedFromId: parent.id,
      ownerId: user.id,
    });

    return ok(await serializePromptSingle(fork, user.id));
  } catch (e) {
    return fail(e);
  }
}
