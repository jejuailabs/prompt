// GET  /api/smoke-tests?scope=mine|artifact&artifactId=
// POST /api/smoke-tests — request a smoke test (creates draft AdCampaign)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeSmokeTest } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';

const smokeInclude = {
  artifact: { include: { owner: true } },
  report: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') ?? 'mine';

    if (scope === 'artifact') {
      const artifactId = searchParams.get('artifactId');
      if (!artifactId) throw new HttpError('artifactId가 필요합니다', 400);
      const tests = await db.smokeTest.findMany({
        where: { artifactId },
        include: smokeInclude,
        orderBy: { requestedAt: 'desc' },
      });
      return ok(tests.map(serializeSmokeTest));
    }

    // scope=mine (default) — requires login
    const user = await requireUser();
    const tests = await db.smokeTest.findMany({
      where: { requestedById: user.id },
      include: smokeInclude,
      orderBy: { requestedAt: 'desc' },
    });
    return ok(tests.map(serializeSmokeTest));
  } catch (e) {
    return fail(e);
  }
}

interface CreateBody {
  artifactId?: string;
  budget?: number;
  days?: number;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<CreateBody>(req);
    if (!body.artifactId) throw new HttpError('artifactId가 필요합니다', 400);
    const artifact = await db.artifact.findUnique({ where: { id: body.artifactId } });
    if (!artifact) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);

    const budget = Math.max(0, Number(body.budget) || 0);
    const days = Math.min(Math.max(Math.round(Number(body.days) || 14), 1), 60);

    const campaign = await db.adCampaign.create({
      data: { artifactId: artifact.id, budget, status: 'draft' },
    });

    const smokeTest = await db.smokeTest.create({
      data: {
        artifactId: artifact.id,
        requestedById: user.id,
        budget,
        days,
        adCampaignId: campaign.id,
        status: 'requested',
      },
      include: smokeInclude,
    });

    await logEvent('smoke_test.requested', {
      smokeTestId: smokeTest.id,
      artifactId: artifact.id,
      budget,
      days,
      requestedById: user.id,
    });

    return ok(serializeSmokeTest(smokeTest));
  } catch (e) {
    return fail(e);
  }
}
