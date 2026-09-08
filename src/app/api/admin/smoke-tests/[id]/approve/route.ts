// POST /api/admin/smoke-tests/[id]/approve — admin approves; → approved → running → async completion (~4s)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializeSmokeTest } from '@/lib/server/serialize';
import { scheduleSmokeTestCompletion } from '@/lib/server/runners';
import { logEvent } from '@/lib/events';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireAdmin();

    const smokeTest = await db.smokeTest.findUnique({ where: { id } });
    if (!smokeTest) throw new HttpError('스모크 테스트를 찾을 수 없습니다', 404);
    if (smokeTest.status === 'completed') {
      throw new HttpError('이미 완료된 테스트입니다', 400);
    }
    if (smokeTest.status === 'running') {
      throw new HttpError('이미 실행 중인 테스트입니다', 400);
    }

    // approved → immediately running
    await db.smokeTest.update({ where: { id }, data: { status: 'approved' } });
    const running = await db.smokeTest.update({
      where: { id },
      data: { status: 'running' },
      include: { artifact: { include: { owner: true } }, report: true },
    });

    if (smokeTest.adCampaignId) {
      await db.adCampaign
        .update({ where: { id: smokeTest.adCampaignId }, data: { status: 'running', startAt: new Date() } })
        .catch(() => undefined);
    }

    await logEvent('smoke_test.approved', { smokeTestId: id, approvedBy: 'admin' });

    // Fire-and-forget completion (~4s later): metrics + LLM insights + report
    scheduleSmokeTestCompletion(id);

    return ok(serializeSmokeTest(running));
  } catch (e) {
    return fail(e);
  }
}
