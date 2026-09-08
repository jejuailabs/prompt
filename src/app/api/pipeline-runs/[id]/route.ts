// GET /api/pipeline-runs/[id] — RunDTO (poll)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserFast, HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializeRuns } from '@/lib/server/serialize';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUserFast();
    const run = await db.pipelineRun.findUnique({
      where: { id },
      include: { resultArtifact: { include: { owner: true } } },
    });
    if (!run) throw new HttpError('실행 기록을 찾을 수 없습니다', 404);

    const [dto] = await serializeRuns([run], user?.id ?? null);
    return ok(dto);
  } catch (e) {
    return fail(e);
  }
}
