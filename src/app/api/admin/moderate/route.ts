// POST /api/admin/moderate — hide | dismiss | restore on prompt/artifact
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { logEvent } from '@/lib/events';

interface ModerateBody {
  targetType?: string;
  targetId?: string;
  action?: 'hide' | 'dismiss' | 'restore';
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<ModerateBody>(req);
    const { targetType, targetId, action } = body;
    if ((targetType !== 'prompt' && targetType !== 'artifact') || !targetId) {
      throw new HttpError('잘못된 요청입니다', 400);
    }
    if (action !== 'hide' && action !== 'dismiss' && action !== 'restore') {
      throw new HttpError('잘못된 동작입니다', 400);
    }

    if (targetType === 'prompt') {
      const prompt = await db.prompt.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!prompt) throw new HttpError('대상을 찾을 수 없습니다', 404);
      if (action === 'hide') {
        await db.prompt.update({ where: { id: targetId }, data: { status: 'hidden' } });
      } else if (action === 'dismiss') {
        await db.prompt.update({ where: { id: targetId }, data: { reportCount: 0 } });
      } else {
        await db.prompt.update({ where: { id: targetId }, data: { status: 'active' } });
      }
    } else {
      const artifact = await db.artifact.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!artifact) throw new HttpError('대상을 찾을 수 없습니다', 404);
      if (action === 'hide') {
        await db.artifact.update({ where: { id: targetId }, data: { status: 'hidden' } });
      } else if (action === 'dismiss') {
        await db.artifact.update({ where: { id: targetId }, data: { reportCount: 0 } });
      } else {
        await db.artifact.update({ where: { id: targetId }, data: { status: 'published' } });
      }
    }

    await logEvent('moderation.action', { targetType, targetId, action });
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}
