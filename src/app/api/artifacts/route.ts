// GET /api/artifacts?scope=feed|mine|drafts&type=&q=&sort=new|popular&moduleId=&limit=
// POST /api/artifacts — create artifact (draft or published)
import { NextRequest } from 'next/server';
import { supaAdmin } from '@/lib/supabase/admin';
import { db } from '@/lib/db';
import { getSessionUserFast, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeArtifactSingle } from '@/lib/server/serialize';
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

function parseJsonSafe<T>(raw: unknown, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw as T;
  try { return JSON.parse(raw as string); } catch { return fallback; }
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

    let query = supaAdmin
      .from('Artifact')
      .select('*, owner:Profile!Artifact_ownerId_fkey(*)')
      .limit(limit);

    if (scope === 'mine' || scope === 'drafts') {
      if (!user) throw new HttpError('로그인이 필요합니다', 401);
      query = query.eq('ownerId', user.id);
      if (scope === 'drafts') query = query.eq('status', 'draft');
    } else {
      query = query.eq('status', 'published').eq('visibility', 'public');
    }

    if (type) query = query.eq('type', type);
    if (moduleId) query = query.eq('sourceModule', moduleId);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

    if (sort === 'popular') {
      query = query.order('likeCount', { ascending: false });
    } else {
      query = query.order('createdAt', { ascending: false });
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // Filter disabled modules for feed scope
    let filtered = rows ?? [];
    if (scope === 'feed') {
      const { data: modules } = await supaAdmin
        .from('Module')
        .select('id, enabled');
      const disabled = new Set((modules ?? []).filter((m: Record<string, unknown>) => !m.enabled).map((m: Record<string, unknown>) => m.id as string));
      filtered = filtered.filter((a: Record<string, unknown>) => !a.sourceModule || !disabled.has(a.sourceModule as string));
    }

    let likedSet = new Set<string>();
    if (user && filtered.length) {
      const { data: votes } = await supaAdmin
        .from('Vote')
        .select('targetId')
        .eq('targetType', 'artifact')
        .eq('userId', user.id)
        .in('targetId', filtered.map((r: Record<string, unknown>) => r.id as string));
      if (votes) likedSet = new Set(votes.map((v: Record<string, unknown>) => v.targetId as string));
    }

    const dtos: ArtifactDTO[] = filtered.map((a: Record<string, unknown>) => {
      const owner = a.owner as Record<string, unknown> | null;
      const meta = parseJsonSafe<Partial<ArtifactMetadata>>(a.metadata, {});
      const metadata: ArtifactMetadata = {
        ...meta,
        tags: meta.tags ?? [],
        stats: meta.stats ?? { views: (a.views as number) ?? 0, plays: 0, likes: (a.likeCount as number) ?? 0, completionRate: 0 },
      };
      return {
        id: a.id as string,
        type: a.type as ArtifactType,
        title: a.title as string,
        description: (a.description as string) ?? '',
        ownerId: a.ownerId as string,
        owner: {
          id: owner?.id as string ?? '',
          username: owner?.username as string ?? '',
          avatarUrl: (owner?.avatarUrl as string) ?? null,
          role: (owner?.role as string) ?? 'user',
        },
        sourcePromptId: (a.sourcePromptId as string) ?? null,
        sourceModule: (a.sourceModule as string) ?? null,
        fileUrl: (a.fileUrl as string) ?? null,
        contentUrl: (a.contentUrl as string) ?? null,
        metadata,
        executionTier: (a.executionTier ?? null) as ExecutionTier | null,
        status: a.status as ArtifactDTO['status'],
        visibility: a.visibility as string,
        version: String((a.version as number) ?? 1),
        views: (a.views as number) ?? 0,
        createdAt: a.createdAt as string,
        likeCount: (a.likeCount as number) ?? 0,
        commentCount: (a.commentCount as number) ?? 0,
        likedByMe: likedSet.has(a.id as string),
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
