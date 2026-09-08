// GET /api/artifacts?scope=feed|mine|drafts&type=&q=&sort=new|popular&moduleId=&limit=
// POST /api/artifacts — create artifact (draft or published)
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionUser, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeArtifacts, serializeArtifactSingle } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';

const DEFAULT_LIMIT = 24;
const POPULAR_POOL = 200;

interface CreateBody {
  title?: string;
  type?: string;
  description?: string;
  fileUrl?: string;
  contentUrl?: string;
  metadata?: Record<string, unknown>;
  sourcePromptId?: string;
  sourceModule?: string;
  publish?: boolean;
  visibility?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') ?? 'feed';
    const type = searchParams.get('type') || undefined;
    const q = searchParams.get('q') || undefined;
    const sort = searchParams.get('sort') === 'popular' ? 'popular' : 'new';
    const moduleId = searchParams.get('moduleId') || undefined;
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || DEFAULT_LIMIT, 1), 100);

    const user = await getSessionUser();
    const where: Prisma.ArtifactWhereInput = {};

    if (scope === 'mine' || scope === 'drafts') {
      if (!user) throw new HttpError('로그인이 필요합니다', 401);
      where.ownerId = user.id;
      if (scope === 'drafts') where.status = 'draft';
    } else {
      // feed: published + public
      where.status = 'published';
      where.visibility = 'public';
    }

    if (type) where.type = type;
    if (moduleId) where.sourceModule = moduleId;
    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }

    const take = sort === 'popular' ? POPULAR_POOL : limit;
    const rows = await db.artifact.findMany({
      where,
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
      take,
    });

    let result = rows;
    if (scope === 'feed') {
      // Filter out artifacts whose sourceModule refers to a disabled module
      const modules = await db.module.findMany({ select: { id: true, enabled: true } });
      const disabled = new Set(modules.filter((m) => !m.enabled).map((m) => m.id));
      result = rows.filter((a) => !a.sourceModule || !disabled.has(a.sourceModule));
    }

    if (sort === 'popular') {
      const { loadSocial, serializeArtifact } = await import('@/lib/server/serialize');
      const social = await loadSocial('artifact', result.map((a) => a.id), user?.id ?? null);
      result = [...result]
        .sort((a, b) => (social.likes.get(b.id) ?? 0) - (social.likes.get(a.id) ?? 0))
        .slice(0, limit);
      return ok(result.map((a) => serializeArtifact(a, social)));
    }

    return ok(await serializeArtifacts(result.slice(0, limit), user?.id ?? null));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<CreateBody>(req);
    if (!body.title || !body.title.trim()) throw new HttpError('제목을 입력해주세요', 400);
    if (!body.type) throw new HttpError('프로젝트 타입을 지정해주세요', 400);

    const status = body.publish ? 'published' : 'draft';
    const artifact = await db.artifact.create({
      data: {
        ownerId: user.id,
        type: body.type,
        title: body.title.trim().slice(0, 120),
        description: (body.description ?? '').slice(0, 2000),
        fileUrl: body.fileUrl ?? null,
        contentUrl: body.contentUrl ?? null,
        metadata: JSON.stringify(body.metadata ?? {}),
        sourcePromptId: body.sourcePromptId ?? null,
        sourceModule: body.sourceModule ?? null,
        status,
        visibility: body.visibility === 'private' ? 'private' : 'public',
      },
      include: { owner: true },
    });

    await logEvent(status === 'published' ? 'artifact.published' : 'artifact.created', {
      artifactId: artifact.id,
      title: artifact.title,
      ownerId: user.id,
      sourceModule: artifact.sourceModule,
    });

    return ok(await serializeArtifactSingle(artifact, user.id));
  } catch (e) {
    return fail(e);
  }
}
