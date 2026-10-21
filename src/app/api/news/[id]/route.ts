// GET /api/news/:id (counts a view) · PATCH / DELETE (staff only)
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { NEWS_MODULE, parseNewsInput, serializeNews } from '@/modules/coai-news/server';

type Ctx = { params: Promise<{ id: string }> };

async function findNews(id: string) {
  const row = await db.artifact.findUnique({ where: { id } });
  if (!row || row.sourceModule !== NEWS_MODULE || row.type !== 'text' || row.status !== 'published') throw new HttpError('뉴스를 찾을 수 없어요.', 404);
  return row;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await findNews(id);
    const row = await db.artifact.update({ where: { id }, data: { views: { increment: 1 } } });
    return ok(serializeNews(row));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await findNews(id);
    const input = parseNewsInput(await readJson(req));
    const row = await db.artifact.update({
      where: { id },
      data: { title: input.title, description: input.summary[0], fileUrl: input.imageUrl, metadata: JSON.stringify({ news: input }) },
    });
    return ok(serializeNews(row));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await findNews(id);
    await db.artifact.update({ where: { id }, data: { status: 'archived' } });
    return ok({ id });
  } catch (error) {
    return fail(error);
  }
}
