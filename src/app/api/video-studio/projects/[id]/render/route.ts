import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { queueRunpodWorkflow, type RunpodInputImage } from '@/lib/server/runpod';
import { buildH3TextToVideoWorkflow, buildLtxTextToVideoWorkflow, getEngineForFirstShot, type VideoAspectRatio } from '@/lib/server/video-workflows';
import { beginMeteredOperation, failMeteredOperation } from '@/lib/server/operation-ledger';

function metadata(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

async function getRunpodFirstFrame(url: string): Promise<RunpodInputImage> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !url.startsWith(supabaseUrl)) {
    throw new HttpError('업로드한 시작 이미지만 영상 생성에 사용할 수 있습니다', 400);
  }
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new HttpError('시작 이미지를 불러올 수 없습니다', 400);
  const contentType = response.headers.get('content-type')?.split(';')[0] ?? '';
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) throw new HttpError('지원하지 않는 시작 이미지 형식입니다', 400);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new HttpError('시작 이미지는 5MB 이하여야 합니다', 400);
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  return { name: `first-frame.${extension}`, image: `data:${contentType};base64,${bytes.toString('base64')}` };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson<{ shotId?: string; engine?: string }>(req);
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);

    const meta = metadata(project.metadata);
    const inputMode = typeof meta.inputMode === 'string' ? meta.inputMode : 'text';
    const quality = typeof meta.quality === 'string' ? meta.quality : 'draft';
    const validEngines = ['h3', 'wan', 'ltx'] as const;
    const engineOverride = typeof body.engine === 'string' && validEngines.includes(body.engine as typeof validEngines[number]) ? body.engine as typeof validEngines[number] : null;
    const engine = engineOverride ?? getEngineForFirstShot(inputMode, quality);
    if (!engine) throw new HttpError('첫·끝 프레임과 이어 만들기는 다음 워크플로우 단계에서 사용할 수 있습니다', 409);

    const prompt = typeof meta.prompt === 'string' ? meta.prompt.trim() : '';
    if (prompt.length < 3) throw new HttpError('렌더할 프롬프트가 없습니다', 400);
    const duration = typeof meta.targetDurationSec === 'number' ? meta.targetDurationSec : 6;
    const aspect = meta.aspectRatio === '16:9' || meta.aspectRatio === '1:1' ? meta.aspectRatio : '9:16';
    const inputImageUrl = typeof meta.inputImageUrl === 'string' ? meta.inputImageUrl : null;
    if (inputMode === 'image' && !inputImageUrl) throw new HttpError('시작 이미지를 찾을 수 없습니다', 400);
    const firstFrame = inputImageUrl ? await getRunpodFirstFrame(inputImageUrl) : undefined;
    const renderInput = { prompt, durationSec: duration, aspectRatio: aspect as VideoAspectRatio, ...(firstFrame ? { firstFrameName: firstFrame.name } : {}) };
    const workflow = engine === 'h3' ? buildH3TextToVideoWorkflow(renderInput) : buildLtxTextToVideoWorkflow(renderInput);
    const ledger = await beginMeteredOperation({ userId: user.id, engine, prompt, aspect, style: typeof meta.style === 'string' ? meta.style : null });
    let job;
    try {
      job = await queueRunpodWorkflow(engine, workflow, firstFrame ? [firstFrame] : undefined);
    } catch (error) {
      await failMeteredOperation(ledger.operationId, error instanceof Error ? error.message : 'Runpod 렌더 요청 실패');
      throw error;
    }

    const nextMeta = {
      ...meta,
      projectStatus: 'rendering',
      activeShotId: body.shotId ?? 'shot-1',
      render: { engine, runpodJobId: job.id, accountingJobId: ledger.operationId, creditCharged: ledger.creditCharged, status: job.status, queuedAt: new Date().toISOString() },
    };
    await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(nextMeta), status: 'processing' } });
    return ok({ projectId: project.id, engine, jobId: job.id, status: job.status, creditCharged: ledger.creditCharged });
  } catch (error) {
    return fail(error);
  }
}
