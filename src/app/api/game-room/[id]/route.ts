// GET/PATCH/DELETE /api/game-room/[id]
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, requireUser, HttpError } from '@/lib/auth';
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = await req.json();

    const game = await db.artifact.findUnique({ where: { id } });
    if (!game || game.type !== 'game') return fail(new HttpError('게임을 찾을 수 없습니다', 404));
    if (game.ownerId !== user.id && user.role !== 'admin') return fail(new HttpError('권한이 없습니다', 403));

    const data: Record<string, unknown> = {};
    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
    if (typeof body.description === 'string') data.description = body.description.trim();
    if (typeof body.contentUrl === 'string') data.contentUrl = body.contentUrl.trim();
    if (body.metadata) {
      const existing = (() => { try { return JSON.parse(game.metadata); } catch { return {}; } })();
      data.metadata = JSON.stringify({ ...existing, ...body.metadata });
    }

    const updated = await db.artifact.update({ where: { id }, data });
    return ok({ id: updated.id, title: updated.title });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const game = await db.artifact.findUnique({ where: { id } });
    if (!game || game.type !== 'game') return fail(new HttpError('게임을 찾을 수 없습니다', 404));
    if (game.ownerId !== user.id && user.role !== 'admin') return fail(new HttpError('권한이 없습니다', 403));

    await db.$transaction([
      db.gamePlay.deleteMany({ where: { artifactId: id } }),
      db.adImpression.deleteMany({ where: { artifactId: id } }),
      db.vote.deleteMany({ where: { targetType: 'artifact', targetId: id } }),
      db.artifact.delete({ where: { id } }),
    ]);
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}
