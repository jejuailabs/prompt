// POST /api/briefs/[id]/match — author picks a winning bid → Match + Contract, brief matched
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeBrief } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';
import type { StructuredSpec } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const brief = await db.problemBrief.findUnique({ where: { id } });
    if (!brief) throw new HttpError('브리프를 찾을 수 없습니다', 404);
    if (brief.authorId !== user.id) throw new HttpError('브리프 작성자만 매칭할 수 있습니다', 403);
    if (brief.status !== 'approved') {
      throw new HttpError('승인 상태의 브리프만 매칭할 수 있습니다', 400);
    }

    const body = await readJson<{ bidId?: string }>(req);
    if (!body.bidId) throw new HttpError('bidId가 필요합니다', 400);
    const bid = await db.bid.findUnique({ where: { id: body.bidId } });
    if (!bid || bid.briefId !== id) throw new HttpError('입찰을 찾을 수 없습니다', 404);

    // Build milestones from the structured spec (features + pages)
    const spec = (() => {
      try {
        return JSON.parse(brief.structuredSpec) as Partial<StructuredSpec>;
      } catch {
        return {} as Partial<StructuredSpec>;
      }
    })();
    const features = Array.isArray(spec.features) ? spec.features : [];
    const pages = Array.isArray(spec.pages) ? spec.pages : [];
    const milestones = [
      `M1 · 기획 확정: ${features[0] ?? '요구사항 정의 및 범위 합의'}`,
      `M2 · 핵심 기능 개발: ${features[1] ?? features[0] ?? 'MVP 기능 구현'}`,
      `M3 · 화면 구현: ${pages[0] ?? '주요 페이지 개발'}`,
      'M4 · 검수 · 배포 및 정산 개시',
    ];

    const updated = await db.$transaction(async (tx) => {
      await tx.bid.update({ where: { id: bid.id }, data: { status: 'accepted' } });
      await tx.bid.updateMany({
        where: { briefId: id, id: { not: bid.id } },
        data: { status: 'rejected' },
      });
      const match = await tx.match.create({
        data: { briefId: id, bidId: bid.id },
      });
      await tx.contract.create({
        data: {
          matchId: match.id,
          revenueShareTerms: JSON.stringify({
            developerShare: 70,
            platformShare: 30,
            milestones,
            notes: '매출 발생 시 개발자 70% / 플랫폼 30% 비율로 자동 정산됩니다.',
          }),
          status: 'active',
        },
      });
      return tx.problemBrief.update({
        where: { id },
        data: { status: 'matched' },
        include: {
          author: true,
          bids: { include: { developer: true } },
          match: { include: { contract: true, bid: { include: { developer: true } } } },
        },
      });
    });

    await logEvent('problem_brief.matched', {
      briefId: id,
      bidId: bid.id,
      developerId: bid.developerId,
      matchedBy: user.id,
    });

    return ok(serializeBrief(updated));
  } catch (e) {
    return fail(e);
  }
}
