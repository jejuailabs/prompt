// POST /api/lab/jobs/process — process a single queued generation job
// Called by client polling; each invocation handles ONE job so it finishes within Vercel timeout.
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { processOneGenerationJob } from '@/lib/server/runners';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { jobId } = (await req.json()) as { jobId?: string };
    if (!jobId) return ok({ processed: false, reason: 'no jobId' });

    const job = await db.generationJob.findUnique({ where: { id: jobId } });
    if (!job) return ok({ processed: false, reason: 'not found' });
    if (job.userId !== user.id) return ok({ processed: false, reason: 'not owner' });
    if (job.status !== 'queued') return ok({ processed: false, reason: `status is ${job.status}` });

    await processOneGenerationJob(jobId);
    return ok({ processed: true });
  } catch (e) {
    return fail(e);
  }
}
