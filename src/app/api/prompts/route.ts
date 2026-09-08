// GET /api/prompts?scope=all|mine&sort=new|popular|forked&category=&q=
// POST /api/prompts — create prompt (initial version row included)
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionUserFast, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { loadPromptExtras, loadSocial, serializePrompt, serializePrompts, serializePromptSingle } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';

const DEFAULT_LIMIT = 48;
const POPULAR_POOL = 200;

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

    const take = sort === 'popular' || sort === 'forked' ? POPULAR_POOL : limit;
    const rows = await db.prompt.findMany({
      where,
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
      take,
    });

    let result = rows;
    if (sort === 'popular' || sort === 'forked') {
      const [social, extras] = await Promise.all([
        loadSocial('prompt', rows.map((p) => p.id), user?.id ?? null),
        loadPromptExtras(rows.map((p) => p.id)),
      ]);
      result = [...rows]
        .sort((a, b) => {
          if (sort === 'forked') {
            return (extras.forks.get(b.id) ?? 0) - (extras.forks.get(a.id) ?? 0);
          }
          return (social.likes.get(b.id) ?? 0) - (social.likes.get(a.id) ?? 0);
        })
        .slice(0, limit);
      return ok(result.map((p) => serializePrompt(p, social, extras)));
    }

    return ok(await serializePrompts(result.slice(0, limit), user?.id ?? null));
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
