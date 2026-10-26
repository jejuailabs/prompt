// POST /api/lab/jobs/cancel — stop a queued/running generation job and refund its credits
// A provider call that is already in flight cannot be aborted from here; the runner discards its result
// when it finds the job cancelled, so the user is refunded and nothing is published.
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireApiUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { refundCredits } from '@/lib/server/credits';
import { serializeJobs } from '@/lib/server/serialize';

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const { jobId } = await readJson<{ jobId?: string }>(req);
    if (!jobId) throw new HttpError('jobId가 필요합니다', 400);

    const job = await db.generationJob.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== user.id) throw new HttpError('작업을 찾을 수 없습니다', 404);

    // Atomic state change: only one of cancel / runner completion / runner failure can win
    const cancelled = await db.generationJob.updateMany({
      where: { id: job.id, status: { in: ['queued', 'running'] } },
      data: { status: 'cancelled', error: null, completedAt: new Date() },
    });
    if (cancelled.count > 0) await refundCredits(user.id, job.creditCharged, job.id);

    const fresh = await db.generationJob.findMany({
      where: { id: job.id },
      include: { provider: true, resultArtifact: { include: { owner: true } } },
    });
    const [serialized] = await serializeJobs(fresh, user.id);
    return ok({ job: serialized });
  } catch (e) {
    return fail(e);
  }
}
