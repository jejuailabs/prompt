// POST /api/briefs/[id]/submit — author submits draft → submitted
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializeBrief } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const brief = await db.problemBrief.findUnique({ where: { id } });
    if (!brief) throw new HttpError('브리프를 찾을 수 없습니다', 404);
    if (brief.authorId !== user.id) throw new HttpError('본인 브리프만 제출할 수 있습니다', 403);
    if (brief.status !== 'draft') throw new HttpError('임시저장 상태의 브리프만 제출할 수 있습니다', 400);

    const updated = await db.problemBrief.update({
      where: { id },
      data: { status: 'submitted' },
      include: {
        author: true,
        bids: { include: { developer: true } },
        match: { include: { contract: true, bid: { include: { developer: true } } } },
      },
    });

    await logEvent('problem_brief.submitted', { briefId: id, authorId: user.id });
    return ok(serializeBrief(updated));
  } catch (e) {
    return fail(e);
  }
}
