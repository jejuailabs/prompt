// POST /api/briefs/[id]/bids — developer bid on an approved brief
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeBid } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';

type RouteParams = { params: Promise<{ id: string }> };

interface BidBody {
  proposal?: string;
  price?: number;
  etaDays?: number;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const brief = await db.problemBrief.findUnique({ where: { id } });
    if (!brief) throw new HttpError('브리프를 찾을 수 없습니다', 404);
    if (brief.status !== 'approved') {
      throw new HttpError('승인된 브리프에만 입찰할 수 있습니다', 400);
    }

    const body = await readJson<BidBody>(req);
    const proposal = (body.proposal ?? '').trim();
    if (!proposal) throw new HttpError('제안 내용을 입력해주세요', 400);
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) throw new HttpError('유효한 금액을 입력해주세요', 400);
    const etaDays = Math.min(Math.max(Math.round(Number(body.etaDays) || 14), 1), 365);

    const bid = await db.bid.create({
      data: {
        briefId: id,
        developerId: user.id,
        proposal: proposal.slice(0, 2000),
        price,
        etaDays,
        status: 'pending',
      },
      include: { developer: true },
    });

    await logEvent('brief_bid.created', { briefId: id, bidId: bid.id, developerId: user.id });
    return ok(serializeBid(bid));
  } catch (e) {
    return fail(e);
  }
}
