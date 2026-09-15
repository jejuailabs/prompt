// GET /api/game-room/leaderboard?period=today|week|month|all&gameId=...
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'today';
    const gameId = searchParams.get('gameId');
    const limit = Math.min(50, Number(searchParams.get('limit')) || 20);

    const now = new Date();
    let since: Date;
    switch (period) {
      case 'week':
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        since = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'all':
        since = new Date(0);
        break;
      default: // today
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
    }

    const where: Record<string, unknown> = {
      score: { gt: 0 },
      createdAt: { gte: since },
      userId: { not: null },
    };
    if (gameId) where.artifactId = gameId;

    const plays = await db.gamePlay.findMany({
      where,
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        artifact: { select: { id: true, title: true } },
      },
    });

    const rankings = plays.map((p, i) => ({
      rank: i + 1,
      userId: p.user?.id,
      username: p.user?.username ?? '익명',
      avatarUrl: p.user?.avatarUrl,
      score: p.score,
      gameId: p.artifact.id,
      gameTitle: p.artifact.title,
      playedAt: p.createdAt.toISOString(),
    }));

    return ok({ rankings, period });
  } catch (e) {
    return fail(e);
  }
}
