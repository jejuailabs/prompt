// GET /api/artifacts?scope=feed|mine|drafts&type=&q=&sort=new|popular&moduleId=&limit=
// POST /api/artifacts — create artifact (draft or published)
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionUserFast, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { parseJson, serializeArtifactSingle, toUserBrief } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';
import type { ArtifactDTO, ArtifactMetadata, ArtifactType, ExecutionTier } from '@/lib/types';

const DEFAULT_LIMIT = 24;

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

    const user = await getSessionUserFast();
    const where: Prisma.ArtifactWhereInput = {};

    if (scope === 'mine' || scope === 'drafts') {
      if (!user) throw new HttpError('로그인이 필요합니다', 401);
      where.ownerId = user.id;
      if (scope === 'drafts') where.status = 'draft';
    } else {
      where.status = 'published';
      where.visibility = 'public';
    }

    if (type) where.type = type;
    if (moduleId) where.sourceModule = moduleId;
    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }

    const orderBy: Prisma.ArtifactOrderByWithRelationInput =
      sort === 'popular' ? { likeCount: 'desc' } : { createdAt: 'desc' };

    const rows = await db.artifact.findMany({
      where,
      include: { owner: true },
      orderBy,
      take: limit,
    });

    // Filter disabled modules for feed scope
    let result = rows;
    if (scope === 'feed') {
      const modules = await db.module.findMany({ select: { id: true, enabled: true } });
      const disabled = new Set(modules.filter((m) => !m.enabled).map((m) => m.id));
      result = rows.filter((a) => !a.sourceModule || !disabled.has(a.sourceModule));
    }

    let likedSet = new Set<string>();
    if (user && result.length) {
      const myVotes = await db.vote.findMany({
        where: { targetType: 'artifact', targetId: { in: result.map(r => r.id) }, userId: user.id },
        select: { targetId: true },
      });
      likedSet = new Set(myVotes.map(v => v.targetId));
    }

    const dtos: ArtifactDTO[] = result.map(a => {
      const meta = parseJson<Partial<ArtifactMetadata>>(a.metadata, {});
      const metadata: ArtifactMetadata = {
        ...meta,
        tags: meta.tags ?? [],
        stats: meta.stats ?? { views: a.views, plays: 0, likes: a.likeCount, completionRate: 0 },
      };
      return {
        id: a.id,
        type: a.type as ArtifactType,
        title: a.title,
        description: a.description,
        ownerId: a.ownerId,
        owner: toUserBrief(a.owner),
        sourcePromptId: a.sourcePromptId,
        sourceModule: a.sourceModule,
        fileUrl: a.fileUrl,
        contentUrl: a.contentUrl,
        metadata,
        executionTier: (a.executionTier ?? null) as ExecutionTier | null,
        status: a.status as ArtifactDTO['status'],
        visibility: a.visibility,
        version: a.version,
        views: a.views,
        createdAt: a.createdAt.toISOString(),
        likeCount: a.likeCount,
        commentCount: a.commentCount,
        likedByMe: likedSet.has(a.id),
      };
    });

    return ok(dtos);
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

    // Increment parent prompt's artifactCount
    if (body.sourcePromptId) {
      await db.prompt.update({
        where: { id: body.sourcePromptId },
        data: { artifactCount: { increment: 1 } },
      }).catch(() => {});
    }

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
