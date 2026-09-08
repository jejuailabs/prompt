// GET /api/pipeline-runs?scope=mine — own runs (desc)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializeRuns } from '@/lib/server/serialize';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') ?? 'mine';
    if (scope !== 'mine') throw new HttpError('잘못된 요청입니다', 400);

    const user = await requireUser();
    const runs = await db.pipelineRun.findMany({
      where: { userId: user.id },
      include: { resultArtifact: { include: { owner: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return ok(await serializeRuns(runs, user.id));
  } catch (e) {
    return fail(e);
  }
}
