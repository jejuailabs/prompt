// POST /api/comment — create a comment on prompt/artifact
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeComment } from '@/lib/server/serialize';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<{ targetType?: string; targetId?: string; body?: string }>(req);
    const { targetType, targetId } = body;
    const text = (body.body ?? '').trim();
    if ((targetType !== 'prompt' && targetType !== 'artifact') || !targetId) {
      throw new HttpError('잘못된 요청입니다', 400);
    }
    if (!text) throw new HttpError('댓글 내용을 입력해주세요', 400);

    const target =
      targetType === 'prompt'
        ? await db.prompt.findUnique({ where: { id: targetId }, select: { id: true } })
        : await db.artifact.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new HttpError('대상을 찾을 수 없습니다', 404);

    const comment = await db.comment.create({
      data: { targetType, targetId, userId: user.id, body: text.slice(0, 1000) },
      include: { user: true },
    });
    return ok(serializeComment(comment));
  } catch (e) {
    return fail(e);
  }
}
