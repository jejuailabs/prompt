import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { queueRunpodWorkflow } from '@/lib/server/runpod';
import { buildH3TextToVideoWorkflow, buildLtxTextToVideoWorkflow, getEngineForFirstShot, type VideoAspectRatio } from '@/lib/server/video-workflows';

function metadata(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson<{ shotId?: string }>(req);
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);

    const meta = metadata(project.metadata);
    const inputMode = typeof meta.inputMode === 'string' ? meta.inputMode : 'text';
    const quality = typeof meta.quality === 'string' ? meta.quality : 'draft';
    const engine = getEngineForFirstShot(inputMode, quality);
    if (!engine) throw new HttpError('이미지·프레임 영상은 H3/Wan 워크플로우 연결 후 사용할 수 있습니다', 409);

    const prompt = typeof meta.prompt === 'string' ? meta.prompt.trim() : '';
    if (prompt.length < 3) throw new HttpError('렌더할 프롬프트가 없습니다', 400);
    const duration = typeof meta.targetDurationSec === 'number' ? meta.targetDurationSec : 6;
    const aspect = meta.aspectRatio === '16:9' || meta.aspectRatio === '1:1' ? meta.aspectRatio : '9:16';
    const renderInput = { prompt, durationSec: duration, aspectRatio: aspect as VideoAspectRatio };
    const workflow = engine === 'h3' ? buildH3TextToVideoWorkflow(renderInput) : buildLtxTextToVideoWorkflow(renderInput);
    const job = await queueRunpodWorkflow(engine, workflow);

    const nextMeta = {
      ...meta,
      projectStatus: 'rendering',
      activeShotId: body.shotId ?? 'shot-1',
      render: { engine, runpodJobId: job.id, status: job.status, queuedAt: new Date().toISOString() },
    };
    await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(nextMeta), status: 'processing' } });
    return ok({ projectId: project.id, engine, jobId: job.id, status: job.status });
  } catch (error) {
    return fail(error);
  }
}
