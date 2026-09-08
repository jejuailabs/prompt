// GET /api/briefs/[id] — BriefDTO (with bids, match + contract)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializeBrief } from '@/lib/server/serialize';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const brief = await db.problemBrief.findUnique({
      where: { id },
      include: {
        author: true,
        bids: { include: { developer: true }, orderBy: { createdAt: 'desc' } },
        match: { include: { contract: true, bid: { include: { developer: true } } } },
      },
    });
    if (!brief) throw new HttpError('브리프를 찾을 수 없습니다', 404);
    return ok(serializeBrief(brief));
  } catch (e) {
    return fail(e);
  }
}
