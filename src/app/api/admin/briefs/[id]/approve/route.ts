// POST /api/admin/briefs/[id]/approve — admin approves a submitted brief
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializeBrief } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireAdmin();

    const brief = await db.problemBrief.findUnique({ where: { id } });
    if (!brief) throw new HttpError('브리프를 찾을 수 없습니다', 404);
    if (brief.status !== 'submitted') {
      throw new HttpError('제출 상태의 브리프만 승인할 수 있습니다', 400);
    }

    const updated = await db.problemBrief.update({
      where: { id },
      data: { status: 'approved' },
      include: {
        author: true,
        bids: { include: { developer: true } },
        match: { include: { contract: true, bid: { include: { developer: true } } } },
      },
    });

    await logEvent('problem_brief.approved', { briefId: id });
    return ok(serializeBrief(updated));
  } catch (e) {
    return fail(e);
  }
}
