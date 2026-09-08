// GET /api/ranking — top 5 prompts & top 5 published artifacts by likeCount
import { supaAdmin } from '@/lib/supabase/admin';
import { getSessionUserFast } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import type { ArtifactDTO, ArtifactMetadata, ArtifactType, ExecutionTier, PromptDTO } from '@/lib/types';

export async function GET() {
  try {
    const user = await getSessionUserFast();

    const [promptRes, artifactRes] = await Promise.all([
      supaAdmin
        .from('Prompt')
        .select('*, owner:Profile!Prompt_ownerId_fkey(*)')
        .eq('status', 'active')
        .order('likeCount', { ascending: false })
        .limit(5),
      supaAdmin
        .from('Artifact')
        .select('*, owner:Profile!Artifact_ownerId_fkey(*)')
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('likeCount', { ascending: false })
        .limit(5),
    ]);

    if (promptRes.error) throw new Error(promptRes.error.message);
    if (artifactRes.error) throw new Error(artifactRes.error.message);

    const allIds = [
      ...(promptRes.data ?? []).map((p: Record<string, unknown>) => ({ type: 'prompt', id: p.id as string })),
      ...(artifactRes.data ?? []).map((a: Record<string, unknown>) => ({ type: 'artifact', id: a.id as string })),
    ];

    let likedSet = new Set<string>();
    if (user && allIds.length) {
      const promptIds = allIds.filter(x => x.type === 'prompt').map(x => x.id);
      const artifactIds = allIds.filter(x => x.type === 'artifact').map(x => x.id);
      const allVoteIds = [...promptIds, ...artifactIds];
      if (allVoteIds.length) {
        const { data: votes } = await supaAdmin
          .from('Vote')
          .select('targetId')
          .eq('userId', user.id)
          .in('targetId', allVoteIds);
        if (votes) votes.forEach((v: Record<string, unknown>) => likedSet.add(v.targetId as string));
      }
    }

    const prompts: PromptDTO[] = (promptRes.data ?? []).map((p: Record<string, unknown>) => {
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

    const artifacts: ArtifactDTO[] = (artifactRes.data ?? []).map((a: Record<string, unknown>) => {
      const owner = a.owner as Record<string, unknown> | null;
      let meta: Partial<ArtifactMetadata> = {};
      try {
        meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata as string) : (a.metadata as Partial<ArtifactMetadata>) ?? {};
      } catch {}
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

    return ok({ prompts, artifacts });
  } catch (e) {
    return fail(e);
  }
}
