// GET /api/prompts?scope=all|mine&sort=new|popular|forked&category=&q=
// POST /api/prompts — create prompt (initial version row included)
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionUserFast, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { parseJson, serializePromptSingle, toUserBrief } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';
import type { PromptDTO } from '@/lib/types';

const DEFAULT_LIMIT = 48;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') ?? 'all';
    const sort = searchParams.get('sort') ?? 'new';
    const category = searchParams.get('category') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || DEFAULT_LIMIT, 1), 100);

    const user = await getSessionUserFast();
    const where: Prisma.PromptWhereInput = {};

    if (scope === 'mine') {
      if (!user) throw new HttpError('로그인이 필요합니다', 401);
      where.ownerId = user.id;
    } else {
      where.status = 'active';
    }

    if (category) where.category = category;
    if (q) where.OR = [{ title: { contains: q } }, { body: { contains: q } }];

    const orderBy: Prisma.PromptOrderByWithRelationInput =
      sort === 'popular' ? { likeCount: 'desc' } :
      sort === 'forked' ? { forkCount: 'desc' } :
      { createdAt: 'desc' };

    const rows = await db.prompt.findMany({
      where,
      include: { owner: true },
      orderBy,
      take: limit,
    });

    // Check likedByMe in a single query if user is logged in
    let likedSet = new Set<string>();
    if (user && rows.length) {
      const myVotes = await db.vote.findMany({
        where: { targetType: 'prompt', targetId: { in: rows.map(r => r.id) }, userId: user.id },
        select: { targetId: true },
      });
      likedSet = new Set(myVotes.map(v => v.targetId));
    }

    const result: PromptDTO[] = rows.map(p => ({
      id: p.id,
      title: p.title,
      body: p.body,
      category: p.category,
      modelTags: parseJson<string[]>(p.modelTags, []),
      thumbnailUrl: p.thumbnailUrl ?? null,
      ownerId: p.ownerId,
      owner: toUserBrief(p.owner),
      forkedFromId: p.forkedFromId,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      forkCount: p.forkCount,
      artifactCount: p.artifactCount,
      likedByMe: likedSet.has(p.id),
    }));

    return ok(result);
  } catch (e) {
    return fail(e);
  }
}

interface CreateBody {
  title?: string;
  body?: string;
  category?: string;
  modelTags?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<CreateBody>(req);
    if (!body.title || !body.title.trim()) throw new HttpError('제목을 입력해주세요', 400);
    if (!body.body || !body.body.trim()) throw new HttpError('프롬프트 내용을 입력해주세요', 400);

    const tags = Array.isArray(body.modelTags)
      ? body.modelTags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
      : [];

    const prompt = await db.prompt.create({
      data: {
        ownerId: user.id,
        title: body.title.trim().slice(0, 120),
        body: body.body.trim(),
        category: body.category?.trim() || '기타',
        modelTags: JSON.stringify(tags),
        status: 'active',
        visibility: 'public',
      },
      include: { owner: true },
    });

    await db.promptVersion.create({
      data: {
        promptId: prompt.id,
        body: prompt.body,
        versionNote: '초기 버전',
        createdBy: user.id,
      },
    });

    await logEvent('prompt.created', { promptId: prompt.id, title: prompt.title, ownerId: user.id });
    return ok(await serializePromptSingle(prompt, user.id));
  } catch (e) {
    return fail(e);
  }
}
