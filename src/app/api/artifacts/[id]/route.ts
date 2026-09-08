// GET /api/artifacts/[id] — detail (increments views)
// PATCH /api/artifacts/[id] — owner edit
// DELETE /api/artifacts/[id] — owner delete (with FK-safe cleanup)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { parseJson, serializeArtifactSingle } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    const artifact = await db.artifact.findUnique({ where: { id }, include: { owner: true } });
    if (!artifact) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);
    await db.artifact.update({ where: { id: artifact.id }, data: { views: { increment: 1 } } });
    return ok(await serializeArtifactSingle({ ...artifact, views: artifact.views + 1 }, user?.id ?? null));
  } catch (e) {
    return fail(e);
  }
}

interface PatchBody {
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  status?: 'draft' | 'published' | 'archived' | 'hidden';
  version?: string;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const artifact = await db.artifact.findUnique({ where: { id } });
    if (!artifact) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);
    if (artifact.ownerId !== user.id) throw new HttpError('권한이 없습니다', 403);

    const body = await readJson<PatchBody>(req);
    const data: { title?: string; description?: string; metadata?: string; status?: string; version?: string } = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) throw new HttpError('제목을 입력해주세요', 400);
      data.title = body.title.trim().slice(0, 120);
    }
    if (body.description !== undefined) data.description = body.description.slice(0, 2000);
    if (body.metadata !== undefined) {
      const merged = { ...parseJson<Record<string, unknown>>(artifact.metadata, {}), ...body.metadata };
      data.metadata = JSON.stringify(merged);
    }
    if (body.status !== undefined) {
      if (!['draft', 'published', 'archived', 'hidden'].includes(body.status)) {
        throw new HttpError('잘못된 상태값입니다', 400);
      }
      data.status = body.status;
    }
    if (body.version !== undefined) data.version = body.version.slice(0, 20);

    const updated = await db.artifact.update({
      where: { id: artifact.id },
      data,
      include: { owner: true },
    });

    if (data.status === 'published' && artifact.status !== 'published') {
      await logEvent('artifact.published', {
        artifactId: updated.id,
        title: updated.title,
        ownerId: user.id,
      });
    }

    return ok(await serializeArtifactSingle(updated, user.id));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const artifact = await db.artifact.findUnique({ where: { id } });
    if (!artifact) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);
    if (artifact.ownerId !== user.id) throw new HttpError('권한이 없습니다', 403);

    await db.$transaction([
      db.generationJob.updateMany({ where: { resultArtifactId: id }, data: { resultArtifactId: null } }),
      db.pipelineRun.updateMany({ where: { resultArtifactId: id }, data: { resultArtifactId: null } }),
      db.marketplaceListing.deleteMany({ where: { artifactId: id } }),
      db.adCampaign.deleteMany({ where: { artifactId: id } }),
      db.smokeTestReport.deleteMany({ where: { smokeTest: { artifactId: id } } }),
      db.smokeTest.deleteMany({ where: { artifactId: id } }),
      db.revenueShare.deleteMany({ where: { artifactId: id } }),
      db.comment.deleteMany({ where: { targetType: 'artifact', targetId: id } }),
      db.vote.deleteMany({ where: { targetType: 'artifact', targetId: id } }),
      db.artifact.delete({ where: { id } }),
    ]);

    return ok(null);
  } catch (e) {
    return fail(e);
  }
}
