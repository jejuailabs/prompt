// GET /api/prompts?scope=all|mine&sort=new|popular|forked&category=&q=
// POST /api/prompts — create prompt
import { NextRequest } from 'next/server';
import { supaAdmin } from '@/lib/supabase/admin';
import { db } from '@/lib/db';
import { getSessionUserFast, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializePromptSingle } from '@/lib/server/serialize';
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

    // Build Supabase query — single HTTP call, no Prisma cold start
    let query = supaAdmin
      .from('Prompt')
      .select('*, owner:Profile!Prompt_ownerId_fkey(*)')
      .limit(limit);

    if (scope === 'mine') {
      if (!user) throw new HttpError('로그인이 필요합니다', 401);
      query = query.eq('ownerId', user.id);
    } else {
      query = query.eq('status', 'active');
    }

    if (category) query = query.eq('category', category);
    if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`);

    if (sort === 'popular') {
      query = query.order('likeCount', { ascending: false });
    } else if (sort === 'forked') {
      query = query.order('forkCount', { ascending: false });
    } else {
      query = query.order('createdAt', { ascending: false });
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // likedByMe check
    let likedSet = new Set<string>();
    if (user && rows?.length) {
      const { data: votes } = await supaAdmin
        .from('Vote')
        .select('targetId')
        .eq('targetType', 'prompt')
        .eq('userId', user.id)
        .in('targetId', rows.map((r: Record<string, unknown>) => r.id as string));
      if (votes) likedSet = new Set(votes.map((v: Record<string, unknown>) => v.targetId as string));
    }

    const result: PromptDTO[] = (rows ?? []).map((p: Record<string, unknown>) => {
      const owner = p.owner as Record<string, unknown> | null;
      let modelTags: string[] = [];
      try { modelTags = typeof p.modelTags === 'string' ? JSON.parse(p.modelTags as string) : []; } catch {}
      return {
        id: p.id as string,
        title: p.title as string,
        body: p.body as string,
        category: p.category as string,
        modelTags,
        thumbnailUrl: (p.thumbnailUrl as string) ?? null,
        ownerId: p.ownerId as string,
        owner: {
          id: owner?.id as string ?? '',
          username: owner?.username as string ?? '',
          avatarUrl: (owner?.avatarUrl as string) ?? null,
          role: (owner?.role as string) ?? 'user',
        },
        forkedFromId: (p.forkedFromId as string) ?? null,
        status: p.status as string,
        createdAt: p.createdAt as string,
        likeCount: (p.likeCount as number) ?? 0,
        commentCount: (p.commentCount as number) ?? 0,
        forkCount: (p.forkCount as number) ?? 0,
        artifactCount: (p.artifactCount as number) ?? 0,
        likedByMe: likedSet.has(p.id as string),
      };
    });

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
