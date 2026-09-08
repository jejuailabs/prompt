// POST /api/vote — toggle like on prompt/artifact
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<{ targetType?: string; targetId?: string }>(req);
    const targetType = body.targetType;
    const targetId = body.targetId;
    if ((targetType !== 'prompt' && targetType !== 'artifact') || !targetId) {
      throw new HttpError('잘못된 요청입니다', 400);
    }

    const target =
      targetType === 'prompt'
        ? await db.prompt.findUnique({ where: { id: targetId }, select: { id: true } })
        : await db.artifact.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new HttpError('대상을 찾을 수 없습니다', 404);

    const existing = await db.vote.findUnique({
      where: { targetType_targetId_userId: { targetType, targetId, userId: user.id } },
    });

    let liked: boolean;
    if (existing) {
      await db.vote.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await db.vote.create({ data: { targetType, targetId, userId: user.id, value: 1 } });
      liked = true;
    }

    const delta = liked ? 1 : -1;
    if (targetType === 'prompt') {
      await db.prompt.update({ where: { id: targetId }, data: { likeCount: { increment: delta } } });
    } else {
      await db.artifact.update({ where: { id: targetId }, data: { likeCount: { increment: delta } } });
    }

    const likeCount = await db.vote.count({ where: { targetType, targetId } });
    return ok({ liked, likeCount });
  } catch (e) {
    return fail(e);
  }
}
