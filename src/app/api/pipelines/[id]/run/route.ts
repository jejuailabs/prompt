// POST /api/pipelines/[id]/run — charge credits upfront, create run, process async (§7 runners)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { chargeCredits } from '@/lib/server/credits';
import { startPipelineRun } from '@/lib/server/runners';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const pipeline = await db.pipeline.findUnique({ where: { id } });
    if (!pipeline) throw new HttpError('파이프라인을 찾을 수 없습니다', 404);
    if (!pipeline.active) throw new HttpError('비활성화된 파이프라인입니다', 400);

    const body = await readJson<{ input?: Record<string, unknown> }>(req).catch(() => ({
      input: {},
    }));
    const input = body.input && typeof body.input === 'object' ? body.input : {};

    // Charge upfront atomically — throws '크레딧이 부족합니다' when insufficient
    await chargeCredits(user.id, pipeline.creditCost, 'pipeline_run');

    const run = await db.pipelineRun.create({
      data: {
        pipelineId: pipeline.id,
        userId: user.id,
        inputPayload: JSON.stringify(input),
        status: 'running',
        progress: 5,
        creditCharged: pipeline.creditCost,
      },
    });

    // Fire-and-forget async execution
    startPipelineRun(run.id);

    return ok({
      id: run.id,
      pipelineId: run.pipelineId,
      status: 'running' as const,
      progress: run.progress,
      creditCharged: run.creditCharged,
      error: null,
      resultArtifact: null,
      createdAt: run.createdAt.toISOString(),
      completedAt: null,
    });
  } catch (e) {
    return fail(e);
  }
}
