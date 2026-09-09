import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get('limit')) || 50));
    const status = url.searchParams.get('status') || undefined;

    const where = status ? { status } : {};

    const [jobs, total] = await Promise.all([
      db.generationJob.findMany({
        where,
        include: {
          provider: { select: { id: true, displayName: true, adapterType: true } },
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.generationJob.count({ where }),
    ]);

    const summary = await db.generationJob.groupBy({
      by: ['status'],
      _count: true,
      _sum: { creditCharged: true },
    });

    return ok({
      jobs: jobs.map((j) => ({
        id: j.id,
        username: (j.user as { username: string }).username,
        provider: (j.provider as { displayName: string }).displayName,
        adapterType: (j.provider as { adapterType: string }).adapterType,
        promptText: j.promptText.slice(0, 80),
        aspect: j.aspect,
        status: j.status,
        creditCharged: j.creditCharged,
        error: j.error,
        createdAt: j.createdAt.toISOString(),
        completedAt: j.completedAt?.toISOString() ?? null,
        durationMs: j.completedAt
          ? j.completedAt.getTime() - j.createdAt.getTime()
          : null,
      })),
      total,
      page,
      limit,
      summary: summary.map((s) => ({
        status: s.status,
        count: s._count,
        totalCredits: s._sum.creditCharged ?? 0,
      })),
    });
  } catch (e) {
    return fail(e);
  }
}

// POST /api/admin/logs — cleanup stuck jobs
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (body.action === 'cleanup-stuck') {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5분 이상 된 running job
      const stuck = await db.generationJob.findMany({
        where: { status: { in: ['queued', 'running'] }, createdAt: { lt: cutoff } },
      });

      let refunded = 0;
      for (const job of stuck) {
        await db.generationJob.update({
          where: { id: job.id },
          data: { status: 'failed', error: '타임아웃 (관리자 정리)', completedAt: new Date() },
        });
        const { refundCredits } = await import('@/lib/server/credits');
        await refundCredits(job.userId, job.creditCharged, job.id).catch(() => undefined);
        refunded += job.creditCharged;
      }

      return ok({ cleaned: stuck.length, refunded });
    }

    return ok({ error: 'Unknown action' });
  } catch (e) {
    return fail(e);
  }
}
