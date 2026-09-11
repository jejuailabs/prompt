// GET /api/game-room — list published games for the game room
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') || 'popular';
    const scope = searchParams.get('scope') || 'public';
    const limit = Math.min(50, Number(searchParams.get('limit')) || 24);

    const pending = scope === 'pending';
    if (pending) await requireAdmin();
    const games = await db.artifact.findMany({
      where: {
        type: 'game',
        status: pending ? 'draft' : 'published',
        visibility: 'public',
      },
      include: {
        owner: { select: { username: true } },
        _count: { select: { gamePlays: true } },
      },
      orderBy: sort === 'recent'
        ? { createdAt: 'desc' }
        : { likeCount: 'desc' },
      take: limit,
    });

    return ok({
      games: games.map((g) => {
        let metadata: Record<string, unknown> = {};
        try { metadata = JSON.parse(g.metadata); } catch {}
        return {
          id: g.id,
          title: g.title,
          description: g.description,
          fileUrl: g.fileUrl,
          contentUrl: g.contentUrl,
          ownerName: g.owner.username,
          playCount: g._count.gamePlays,
          likeCount: g.likeCount,
          createdAt: g.createdAt.toISOString(),
          metadata,
        };
      }),
    });
  } catch (e) {
    return fail(e);
  }
}
