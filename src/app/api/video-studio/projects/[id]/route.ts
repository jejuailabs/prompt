import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

/**
 * The studio only needs a project owned by the signed-in creator.  Do not use
 * the public-gallery serializer here: it also loads vote/comment aggregates
 * that have nothing to do with rendering and can make an otherwise healthy
 * render page fail while those optional queries are unavailable.
 */
function serializeStudioProject(project: {
  id: string;
  type: string;
  title: string;
  description: string;
  ownerId: string;
  sourcePromptId: string | null;
  sourceModule: string | null;
  fileUrl: string | null;
  contentUrl: string | null;
  metadata: string;
  executionTier: string | null;
  status: string;
  visibility: string;
  version: string;
  views: number;
  createdAt: Date;
  owner: { id: string; username: string; avatarUrl: string | null; role: string };
}) {
  let rawMetadata: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(project.metadata);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      rawMetadata = parsed as Record<string, unknown>;
    }
  } catch {
    // A malformed project metadata blob must not hide the user's render.
  }

  return {
    id: project.id,
    type: project.type,
    title: project.title,
    description: project.description,
    ownerId: project.ownerId,
    owner: project.owner,
    sourcePromptId: project.sourcePromptId,
    sourceModule: project.sourceModule,
    fileUrl: project.fileUrl,
    contentUrl: project.contentUrl,
    metadata: {
      ...rawMetadata,
      tags: Array.isArray(rawMetadata.tags) ? rawMetadata.tags : [],
      stats: rawMetadata.stats ?? { views: project.views, plays: 0, likes: 0, completionRate: 0 },
    },
    executionTier: project.executionTier,
    status: project.status,
    visibility: project.visibility,
    version: project.version,
    views: project.views,
    createdAt: project.createdAt.toISOString(),
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await db.artifact.findFirst({
      where: { id, ownerId: user.id, sourceModule: 'video-studio' },
      include: { owner: true },
    });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);
    return ok(serializeStudioProject(project));
  } catch (e) {
    return fail(e);
  }
}
