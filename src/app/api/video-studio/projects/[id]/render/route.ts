import { getH3Config } from '@/lib/server/h3-config';
import { isH3Preset } from '@/lib/h3-presets';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { getRunpodJobStatus, queueRunpodWorkflow, type RunpodInputImage, type RunpodVideoEngine } from '@/lib/server/runpod';
import { buildH3TextToVideoWorkflow, getEngineForFirstShot, type VideoAspectRatio } from '@/lib/server/video-workflows';
import { buildLtx2bWorkflow } from '@/lib/server/ltx-2b-workflow';
import { buildWanWorkflow } from '@/lib/server/wan-workflow';
import { beginMeteredOperation, failMeteredOperation } from '@/lib/server/operation-ledger';
import { buildVideoModelPrompt, compileVideoIntent, createH3ContextIR } from '@/lib/server/video-intent';
import type { ComparisonInfo } from '@/lib/video-comparison';

function metadata(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

async function getRunpodFirstFrame(url: string): Promise<RunpodInputImage> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || new URL(url).origin !== new URL(supabaseUrl).origin || !new URL(url).pathname.startsWith('/storage/v1/object/')) {
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
    const body = await readJson<{ shotId?: string; engine?: string; h3Gpu?: '5090' | 'blackwell'; h3Preset?: string; seed?: number }>(req);
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);

    const meta = metadata(project.metadata);
    const shots = Array.isArray(meta.shots) ? meta.shots as Array<Record<string, unknown>> : [];
    const shotId = body.shotId ?? 'shot-1';
    const shotIndex = shots.findIndex((shot) => shot.id === shotId);
    if (shotIndex < 0) throw new HttpError('샷을 찾을 수 없습니다', 404);
    const shot = shots[shotIndex];
    const priorShot = shotIndex > 0 ? shots[shotIndex - 1] : null;
    const carriedFrame = typeof priorShot?.lastFrameUrl === 'string' ? priorShot.lastFrameUrl : null;
    if (shotIndex > 0 && (!priorShot || priorShot.status !== 'completed' || !carriedFrame)) {
      throw new HttpError('앞 샷이 완료되어 마지막 프레임이 준비된 뒤에 이어 만들 수 있습니다', 409);
    }
    const comparison = meta.comparison as ComparisonInfo | undefined;
    if (comparison && user.role !== 'admin') throw new HttpError('관리자 비교 테스트입니다', 403);
    if (comparison && body.engine && body.engine !== meta.engine) throw new HttpError('비교 모델은 변경할 수 없습니다', 400);
    const current = (shot.render as { engine?: string; h3Gpu?: '5090' | 'blackwell'; runpodJobId?: string; status?: string } | undefined) ?? (meta.render as { engine?: string; h3Gpu?: '5090' | 'blackwell'; runpodJobId?: string; status?: string } | undefined);
    if (current?.runpodJobId && ['IN_QUEUE', 'IN_PROGRESS', 'QUEUED', 'RUNNING'].includes(current.status ?? '')) {
      try {
        const previous = await getRunpodJobStatus(current.engine as RunpodVideoEngine, current.runpodJobId, current.h3Gpu);
        if (['IN_QUEUE', 'IN_PROGRESS', 'QUEUED', 'RUNNING'].includes(previous.status)) {
          return ok({ projectId: project.id, engine: current.engine, jobId: current.runpodJobId, status: previous.status, creditCharged: 0 });
        }
        if (previous.status === 'COMPLETED') throw new HttpError('완료된 결과를 먼저 확인해주세요. 새로고침 후 다시 렌더할 수 있습니다.', 409);
      } catch (error) {
        // Expired RunPod results must not permanently prevent a user retry.
        if (!(error instanceof Error && error.message.startsWith('Runpod API 404:'))) throw error;
      }
    }
    const inputMode = shotIndex > 0 ? 'image' : (typeof meta.inputMode === 'string' ? meta.inputMode : 'text');
    const quality = typeof meta.quality === 'string' ? meta.quality : 'draft';
    const validEngines = ['h3', 'wan', 'ltx'] as const;
    const engineOverride = typeof body.engine === 'string' && validEngines.includes(body.engine as typeof validEngines[number]) ? body.engine as typeof validEngines[number] : null;
    const savedEngine = (meta.render as { engine?: string } | undefined)?.engine ?? meta.engine;
    const engine = engineOverride ?? (validEngines.includes(savedEngine as typeof validEngines[number]) ? savedEngine as typeof validEngines[number] : getEngineForFirstShot(inputMode, quality));
    if (!engine) throw new HttpError('첫·끝 프레임과 이어 만들기는 다음 워크플로우 단계에서 사용할 수 있습니다', 409);

    if (body.h3Gpu !== undefined && !['5090', 'blackwell'].includes(body.h3Gpu)) throw new HttpError('지원하지 않는 H3 GPU입니다', 400);
    const config = engine === 'h3' ? await getH3Config() : null;
    if (body.h3Preset !== undefined && (user.role !== 'admin' || !isH3Preset(body.h3Preset))) throw new HttpError('관리자 프리셋 권한 또는 값이 올바르지 않습니다', 403);
    if (body.seed !== undefined && (user.role !== 'admin' || !Number.isSafeInteger(body.seed) || body.seed < 0 || body.seed > 2147483647)) throw new HttpError('시드 값을 확인해주세요', 400);
    const h3Gpu = comparison ? 'blackwell' : user.role === 'admin' ? body.h3Gpu ?? current?.h3Gpu ?? config?.gpu ?? '5090' : config?.gpu ?? '5090';
    const h3Preset = comparison?.preset ?? (isH3Preset(body.h3Preset) ? body.h3Preset : quality === 'standard' ? config?.quality : config?.speed);
    const preview = engine === 'h3' && meta.preview === true;
    const seed = comparison?.seed ?? body.seed ?? Math.floor(Math.random() * 2147483647);
    const prompt = typeof shot.prompt === 'string' ? shot.prompt.trim() : (typeof meta.prompt === 'string' ? meta.prompt.trim() : '');
    if (prompt.length < 3) throw new HttpError('렌더할 프롬프트가 없습니다', 400);
    const duration = typeof shot.duration === 'number' ? shot.duration : (typeof meta.targetDurationSec === 'number' ? meta.targetDurationSec : 6);
    const aspect = meta.aspectRatio === '16:9' || meta.aspectRatio === '1:1' ? meta.aspectRatio : '9:16';
    const inputImageUrl = shotIndex > 0 ? carriedFrame : (typeof shot.inputImageUrl === 'string' ? shot.inputImageUrl : (typeof meta.inputImageUrl === 'string' ? meta.inputImageUrl : null));
    if (inputMode === 'image' && !inputImageUrl) throw new HttpError('시작 이미지를 찾을 수 없습니다', 400);
    const firstFrame = inputImageUrl ? await getRunpodFirstFrame(inputImageUrl) : undefined;
    const intent = comparison ? undefined : await compileVideoIntent(prompt, { hasReferenceImage: Boolean(firstFrame), durationSec: duration });
    // Persist a versioned plan with every non-comparison render. It is the
    // stable boundary for future multi-reference / storyboard stages and lets
    // users inspect exactly how their wording was interpreted.
    const contextIr = intent ? createH3ContextIR(prompt, intent, { hasReferenceImage: Boolean(firstFrame), durationSec: duration }) : undefined;
    const modelPrompt = comparison?.compiledPrompt ?? buildVideoModelPrompt(intent!, Boolean(firstFrame));
    const renderInput = { comparison: Boolean(comparison), h3Preset, preview, seed, prompt: modelPrompt, durationSec: duration, aspectRatio: aspect as VideoAspectRatio, quality: quality === 'standard' ? 'standard' as const : 'draft' as const, ...(firstFrame ? { firstFrameName: firstFrame.name } : {}) };
    const workflow = engine === 'h3' ? buildH3TextToVideoWorkflow(renderInput)
      : engine === 'wan' ? buildWanWorkflow(renderInput) : buildLtx2bWorkflow(renderInput);
    const ledger = await beginMeteredOperation({ userId: user.id, engine, preview, prompt, aspect, style: typeof meta.style === 'string' ? meta.style : null });
    let job;
    try {
      job = await queueRunpodWorkflow(engine, workflow, firstFrame ? [firstFrame] : undefined, h3Gpu);
      console.log(`[render-queue] project=${project.id} engine=${engine} job=${job.id} status=${job.status} aspect=${aspect} duration=${duration}s`);
    } catch (error) {
      await failMeteredOperation(ledger.operationId, error instanceof Error ? error.message : 'Runpod 렌더 요청 실패');
      throw error;
    }

    const nextMeta = {
      ...meta,
      projectStatus: 'rendering',
      activeShotId: shotId,
      shots: shots.map((candidate, index) => index === shotIndex ? {
        ...candidate, inputMode, inputImageUrl, status: 'rendering', render: {
          engine, h3Gpu, h3Preset, preview, seed, configRevision: config?.revision,
          runpodJobId: job.id, accountingJobId: ledger.operationId, creditCharged: ledger.creditCharged,
          status: job.status, queuedAt: new Date().toISOString(),
        },
      } : candidate),
      render: {
        engine, h3Gpu, h3Preset, preview, seed, configRevision: config?.revision,
        runpodJobId: job.id, accountingJobId: ledger.operationId, creditCharged: ledger.creditCharged,
        status: job.status, queuedAt: new Date().toISOString(),
        compiler: comparison ? { schemaVersion: 'h3-context-ir/v1', source: 'comparison-shared-prompt' } : { schemaVersion: contextIr!.schemaVersion, source: 'playlab-context-compiler' },
        contextIr, intent, compiledPrompt: modelPrompt,
      },
    };
    await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(nextMeta), status: 'processing' } });
    return ok({ projectId: project.id, engine, jobId: job.id, status: job.status, creditCharged: ledger.creditCharged });
  } catch (error) {
    return fail(error);
  }
}
