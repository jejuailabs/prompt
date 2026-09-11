// GET /api/comments?targetType=&targetId= — comments for a target (asc)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';
import { serializeComment } from '@/lib/server/serialize';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');
    if (!targetId) return ok([]);

    const comments = await db.comment.findMany({
      where: {
        targetId,
        ...(targetType === 'prompt' || targetType === 'artifact' || targetType === 'brief' ? { targetType } : {}),
      },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return ok(comments.map(serializeComment));
  } catch (e) {
    return fail(e);
  }
}
