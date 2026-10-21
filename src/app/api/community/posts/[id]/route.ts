// GET /api/community/posts/:id (counts a view) · PATCH (edit own) · DELETE (own or admin)
import { db } from '@/lib/db';
import { HttpError, getSessionUserFast, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { canEditPost, isBoardRow, parsePostInput, serializePost } from '@/modules/community-board/server';

const OWNER = { select: { id: true, username: true, avatarUrl: true } } as const;
type Ctx = { params: Promise<{ id: string }> };

async function findPost(id: string) {
  const row = await db.artifact.findUnique({ where: { id }, include: { owner: OWNER } });
  if (!row || !isBoardRow(row) || row.status !== 'published') throw new HttpError('글을 찾을 수 없어요.', 404);
  return row;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await getSessionUserFast();
    await findPost(id);
    const row = await db.artifact.update({ where: { id }, data: { views: { increment: 1 } }, include: { owner: OWNER } });
    const liked = user ? Boolean(await db.vote.findUnique({ where: { targetType_targetId_userId: { targetType: 'artifact', targetId: id, userId: user.id } } })) : false;
    return ok(serializePost(row, user, liked, true));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const row = await findPost(id);
    if (!canEditPost(row, user)) throw new HttpError('내가 쓴 글만 고칠 수 있어요.', 403);
    const input = parsePostInput(await readJson(req), user);
    const previous = JSON.parse(row.metadata || '{}') as { number?: number };
    const updated = await db.artifact.update({
      where: { id },
      data: { title: input.title, description: input.excerpt, metadata: JSON.stringify({ board: input.board, body: input.body, number: previous.number }) },
      include: { owner: OWNER },
    });
    return ok(serializePost(updated, user, false, true));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const row = await findPost(id);
    if (!canEditPost(row, user)) throw new HttpError('내가 쓴 글만 지울 수 있어요.', 403);
    // Soft delete keeps comment/vote references intact.
    await db.artifact.update({ where: { id }, data: { status: 'archived' } });
    return ok({ id });
  } catch (error) {
    return fail(error);
  }
}
