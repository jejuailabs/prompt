// GET /api/github-pick/:id (counts a view) · DELETE (staff only — hides the card)
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { PICK_MODULE, serializePick } from '@/modules/github-pick/server';

type Ctx = { params: Promise<{ id: string }> };

async function findPick(id: string) {
  const row = await db.artifact.findUnique({ where: { id } });
  if (!row || row.sourceModule !== PICK_MODULE || row.type !== 'text' || row.status !== 'published') throw new HttpError('깃허브 픽을 찾을 수 없어요.', 404);
  return row;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await findPick(id);
    const row = await db.artifact.update({ where: { id }, data: { views: { increment: 1 } } });
    return ok(serializePick(row));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await findPick(id);
    await db.artifact.update({ where: { id }, data: { status: 'archived' } });
    return ok({ id });
  } catch (error) {
    return fail(error);
  }
}
