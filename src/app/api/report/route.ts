// POST /api/report — report a prompt/artifact (increments reportCount)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { logEvent } from '@/lib/events';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<{ targetType?: string; targetId?: string }>(req);
    const { targetType, targetId } = body;
    if ((targetType !== 'prompt' && targetType !== 'artifact') || !targetId) {
      throw new HttpError('잘못된 요청입니다', 400);
    }

    if (targetType === 'prompt') {
      const row = await db.prompt.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw new HttpError('대상을 찾을 수 없습니다', 404);
      await db.prompt.update({ where: { id: targetId }, data: { reportCount: { increment: 1 } } });
    } else {
      const row = await db.artifact.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw new HttpError('대상을 찾을 수 없습니다', 404);
      await db.artifact.update({ where: { id: targetId }, data: { reportCount: { increment: 1 } } });
    }

    await logEvent('content.reported', { targetType, targetId, reporterId: user.id });
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}
