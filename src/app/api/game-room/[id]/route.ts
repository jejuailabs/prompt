// GET /api/game-room/[id] — single game detail
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser().catch(() => null);

    const game = await db.artifact.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true } },
        _count: { select: { gamePlays: true } },
      },
    });

    if (!game || game.type !== 'game') {
      return ok(null);
    }

    // Increment views
    await db.artifact.update({ where: { id }, data: { views: { increment: 1 } } });

    let likedByMe = false;
    if (user) {
      const vote = await db.vote.findUnique({
        where: { targetType_targetId_userId: { targetType: 'artifact', targetId: id, userId: user.id } },
      });
      likedByMe = !!vote;
    }

    let metadata: Record<string, unknown> = {};
    try { metadata = JSON.parse(game.metadata); } catch {}

    return ok({
      id: game.id,
      title: game.title,
      description: game.description,
      contentUrl: game.contentUrl,
      fileUrl: game.fileUrl,
      ownerName: game.owner.username,
      ownerId: game.owner.id,
      playCount: game._count.gamePlays,
      likeCount: game.likeCount,
      likedByMe,
      createdAt: game.createdAt.toISOString(),
      metadata,
    });
  } catch (e) {
    return fail(e);
  }
}
