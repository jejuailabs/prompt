// GET /api/game-room — list published games for the game room
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { LITTLE_WORLDS } from '@/lib/little-worlds';
import { fail, ok } from '@/lib/server/handler';

// Built-in games (/games/<slug>.html) ship a gameplay screenshot at /games/thumbs/<slug>.png.
// It replaces a missing or legacy seed thumbnail so every built-in card has a real image.
function thumbnailFor(fileUrl: string | null, contentUrl: string | null): string | null {
  const builtIn = contentUrl?.match(/^\/games\/([a-z0-9-]+)\.html$/);
  if (builtIn && (!fileUrl || fileUrl.startsWith('/uploads/seed/thumb-'))) return `/games/thumbs/${builtIn[1]}.png`;
  return fileUrl;
}

/** Top 3 players per game: each player's best score, highest first. */
async function topPlayers(gameIds: string[]) {
  if (gameIds.length === 0) return new Map<string, { rank: number; username: string; score: number }[]>();
  const best = await db.gamePlay.groupBy({
    by: ['artifactId', 'userId'],
    where: { artifactId: { in: gameIds }, userId: { not: null }, user: { banned: false }, score: { gt: 0 } },
    _max: { score: true },
  });
  const userIds = [...new Set(best.map((b) => b.userId).filter((id): id is string => Boolean(id)))];
  const users = await db.profile.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } });
  const names = new Map(users.map((u) => [u.id, u.username]));
  const byGame = new Map<string, { rank: number; username: string; score: number }[]>();
  for (const id of gameIds) {
    const top = best
      .filter((b) => b.artifactId === id && b._max.score)
      .sort((a, b) => (b._max.score ?? 0) - (a._max.score ?? 0))
      .slice(0, 3)
      .map((b, index) => ({ rank: index + 1, username: names.get(b.userId ?? '') ?? '익명', score: b._max.score ?? 0 }));
    byGame.set(id, top);
  }
  return byGame;
}

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
        owner: { select: { id: true, username: true } },
        _count: { select: { gamePlays: true } },
      },
      orderBy: sort === 'recent'
        ? { createdAt: 'desc' }
        : { likeCount: 'desc' },
      take: limit,
    });

    const shipped=pending?[]:await db.artifact.findMany({where:{type:'game',contentUrl:{in:LITTLE_WORLDS.map(g=>g.contentUrl)}},include:{owner:{select:{id:true,username:true}},_count:{select:{gamePlays:true}}}});
    const combined=[...games];for(const row of shipped)if(row.status==='published'&&row.visibility==='public'&&!combined.some(g=>g.id===row.id))combined.push(row);
    const leaders = await topPlayers(combined.map((g) => g.id));
    return ok({
      games: combined.map((g) => {
        let metadata: Record<string, unknown> = {};
        try { metadata = JSON.parse(g.metadata); } catch {}
        return {
          id: g.id,
          title: g.title,
          description: g.description,
          fileUrl: thumbnailFor(g.fileUrl, g.contentUrl),
          topPlayers: leaders.get(g.id) ?? [],
          contentUrl: g.contentUrl,
          ownerId: g.owner.id,
          ownerName: g.owner.username,
          playCount: g._count.gamePlays,
          likeCount: g.likeCount,
          createdAt: g.createdAt.toISOString(),
          metadata,
        };
      }).concat(pending?[]:LITTLE_WORLDS.filter(item=>!shipped.some(row=>row.contentUrl===item.contentUrl)).map(item=>({id:'builtin-'+item.slug,title:item.title,description:item.description,fileUrl:item.fileUrl,topPlayers:[],contentUrl:item.contentUrl,ownerId:'',ownerName:'PLAYLAB',playCount:0,likeCount:0,createdAt:'2026-10-07T00:00:00.000Z',metadata:{collection:'little-worlds',controls:item.controls}}))),
    });
  } catch (e) {
    return fail(e);
  }
}
