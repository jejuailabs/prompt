// GET /api/lab/jobs?ids=a,b,c — poll generation jobs (own jobs only)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializeJobs } from '@/lib/server/serialize';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids') ?? '';
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);

    const jobs = await db.generationJob.findMany({
      where: { userId: user.id, ...(ids.length ? { id: { in: ids } } : {}) },
      include: { provider: true, resultArtifact: { include: { owner: true } } },
      orderBy: { createdAt: 'desc' },
      take: ids.length ? ids.length : 12,
    });

    return ok(await serializeJobs(jobs, user.id));
  } catch (e) {
    return fail(e);
  }
}
