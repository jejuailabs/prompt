// GET /api/github-pick?limit= — published 깃허브 픽 cards, newest first.
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';
import { PICK_MODULE, serializePick } from '@/modules/github-pick/server';

export async function GET(req: Request) {
  try {
    const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get('limit')) || 30, 1), 60);
    const rows = await db.artifact.findMany({
      where: { sourceModule: PICK_MODULE, type: 'text', status: 'published', visibility: 'public' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return ok(rows.map(serializePick).filter(Boolean));
  } catch (error) {
    return fail(error);
  }
}
