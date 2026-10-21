// GET /api/news?category=&limit= · POST (staff only)
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { isNewsCategory } from '@/modules/coai-news/news';
import { NEWS_MODULE, parseNewsInput, serializeNews } from '@/modules/coai-news/server';

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const category = params.get('category');
    const limit = Math.min(Math.max(Number(params.get('limit')) || 30, 1), 60);
    const rows = await db.artifact.findMany({
      where: {
        sourceModule: NEWS_MODULE, type: 'text', status: 'published', visibility: 'public',
        ...(isNewsCategory(category) ? { metadata: { contains: `"category":"${category}"` } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return ok(rows.map(serializeNews).filter(Boolean));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const input = parseNewsInput(await readJson(req));
    const row = await db.artifact.create({
      data: {
        ownerId: user.id, type: 'text', sourceModule: NEWS_MODULE, title: input.title, description: input.summary[0],
        fileUrl: input.imageUrl, status: 'published', visibility: 'public', metadata: JSON.stringify({ news: input }),
      },
    });
    return ok(serializeNews(row), 201);
  } catch (error) {
    return fail(error);
  }
}
