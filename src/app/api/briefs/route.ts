// GET  /api/briefs?scope=mine|open|all
// POST /api/briefs — LLM-structured problem brief (status draft)
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeBrief } from '@/lib/server/serialize';
import { chatJson } from '@/lib/server/ai';
import { logEvent } from '@/lib/events';
import type { StructuredSpec } from '@/lib/types';

const briefInclude = {
  author: true,
  bids: { include: { developer: true } },
  match: { include: { contract: true, bid: { include: { developer: true } } } },
} satisfies Prisma.ProblemBriefInclude;

function fallbackSpec(rawText: string): StructuredSpec {
  const text = rawText.trim();
  return {
    title: text.slice(0, 20) || '무제 브리프',
    problem: text.slice(0, 500),
    targetUsers: '일반 사용자',
    features: ['핵심 기능 정의 필요'],
    techStack: [],
    pages: ['메인'],
    effortWeeks: 4,
    suggestedBudgetKrw: 5000000,
    risks: ['요구사항 구체화 필요'],
  };
}

function sanitizeSpec(raw: Partial<StructuredSpec>, rawText: string): StructuredSpec {
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean).slice(0, 12) : [];
  const effort = Number(raw.effortWeeks);
  const budget = Number(raw.suggestedBudgetKrw);
  return {
    title: (raw.title ?? '').toString().trim().slice(0, 60) || rawText.slice(0, 20) || '무제 브리프',
    problem: (raw.problem ?? '').toString().trim() || rawText.slice(0, 500),
    targetUsers: (raw.targetUsers ?? '').toString().trim() || '일반 사용자',
    features: strArr(raw.features),
    techStack: strArr(raw.techStack),
    pages: strArr(raw.pages),
    effortWeeks: Number.isFinite(effort) && effort > 0 ? Math.round(effort) : 4,
    suggestedBudgetKrw: Number.isFinite(budget) && budget > 0 ? Math.round(budget) : 5000000,
    risks: strArr(raw.risks),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') ?? 'open';

    const where: Prisma.ProblemBriefWhereInput =
      scope === 'community'
        ? { status: 'approved', category: 'community' }
        : scope === 'open'
        ? { status: 'approved' }
        : scope === 'mine'
          ? { authorId: (await requireUser()).id }
          : {};

    const briefs = await db.problemBrief.findMany({
      where,
      include: briefInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return ok(briefs.map(serializeBrief));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<{ rawText?: string; community?: boolean }>(req);
    const rawText = (body.rawText ?? '').trim();
    if (rawText.length < 10) {
      throw new HttpError('문제 설명을 10자 이상 입력해주세요', 400);
    }

    let spec: StructuredSpec;
    try {
      const raw = await chatJson<Partial<StructuredSpec>>(
        '당신은 숙련된 프로덕트 매니저입니다. 사용자가 자연어로 설명한 문제/아이디어를 구조화된 기획서(JSON)로 변환합니다. 모든 텍스트는 한국어로 작성하고, effortWeeks와 suggestedBudgetKrw는 숫자로, 다른 형식 없이 JSON만 출력합니다. 형식: {"title":"...","problem":"...","targetUsers":"...","features":["..."],"techStack":["..."],"pages":["..."],"effortWeeks":4,"suggestedBudgetKrw":5000000,"risks":["..."]}',
        rawText,
      );
      spec = sanitizeSpec(raw, rawText);
    } catch {
      spec = fallbackSpec(rawText);
    }

    const brief = await db.problemBrief.create({
      data: {
        authorId: user.id,
        title: spec.title,
        rawText,
        structuredSpec: JSON.stringify(spec),
        budget: spec.suggestedBudgetKrw,
        category: body.community ? 'community' : null,
        // Community help requests are intentionally public on creation. Marketplace
        // briefs retain the moderation workflow.
        status: body.community ? 'approved' : 'draft',
      },
      include: briefInclude,
    });

    await logEvent('problem_brief.created', { briefId: brief.id, authorId: user.id });
    return ok(serializeBrief(brief));
  } catch (e) {
    return fail(e);
  }
}
