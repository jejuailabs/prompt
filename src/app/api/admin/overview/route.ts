// GET /api/admin/overview — moderation queue, pending smoke tests/briefs, users
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import {
  serializeAdminUsers,
  serializeBrief,
  serializeSmokeTest,
  toModerationItem,
} from '@/lib/server/serialize';

export async function GET() {
  try {
    await requireAdmin();

    const [reportedPrompts, reportedArtifacts, pendingSmokeTests, pendingBriefs, profiles] =
      await Promise.all([
        db.prompt.findMany({
          where: { reportCount: { gt: 0 }, status: 'active' },
          include: { owner: true },
          orderBy: { reportCount: 'desc' },
          take: 50,
        }),
        db.artifact.findMany({
          where: { reportCount: { gt: 0 }, status: { in: ['published', 'draft'] } },
          include: { owner: true },
          orderBy: { reportCount: 'desc' },
          take: 50,
        }),
        db.smokeTest.findMany({
          where: { status: 'requested' },
          include: { artifact: { include: { owner: true } }, report: true },
          orderBy: { requestedAt: 'asc' },
        }),
        db.problemBrief.findMany({
          where: { status: 'submitted' },
          include: {
            author: true,
            bids: { include: { developer: true } },
            match: { include: { contract: true, bid: { include: { developer: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        }),
        db.profile.findMany({ orderBy: { createdAt: 'desc' } }),
      ]);

    const reported = [
      ...reportedPrompts.map((p) => toModerationItem('prompt', p, p.owner.username, p.body)),
      ...reportedArtifacts.map((a) => toModerationItem('artifact', a, a.owner.username, a.description)),
    ].sort((a, b) => b.reportCount - a.reportCount);

    return ok({
      reported,
      pendingSmokeTests: pendingSmokeTests.map(serializeSmokeTest),
      pendingBriefs: pendingBriefs.map(serializeBrief),
      users: await serializeAdminUsers(profiles),
    });
  } catch (e) {
    return fail(e);
  }
}
