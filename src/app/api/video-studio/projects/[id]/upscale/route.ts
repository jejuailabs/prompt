import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { beginVideoUpscaleOperation, finishVideoUpscaleOperation } from '@/lib/server/video-upscale-ledger';
import { createVideoUpscaleUpload, videoUpscalePublicUrl } from '@/lib/server/video-upscale-storage';
import { isVideoUpscaleConfigured, queueVideoUpscale } from '@/lib/server/video-upscale-runpod';
import { getVideoUpscaleCredit, getVideoUpscaleTarget, isPlaylabVideoUrl, isVideoUpscaleTier } from '@/lib/server/video-upscale';

function metadata(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

type Shot = Record<string, unknown>;
type ActiveUpscale = { runpodJobId?: string; status?: string };
const ACTIVE = new Set(['IN_QUEUE', 'IN_PROGRESS', 'QUEUED', 'RUNNING']);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson<{ tier?: unknown; shotId?: unknown }>(req);
    if (!isVideoUpscaleTier(body.tier)) throw new HttpError('업스케일 단계를 선택해주세요', 400);
    if (body.shotId !== undefined && typeof body.shotId !== 'string') throw new HttpError('샷 값이 올바르지 않습니다', 400);
    if (!isVideoUpscaleConfigured()) throw new HttpError('영상 업스케일 워커가 아직 연결되지 않았습니다', 503);

    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);
    const meta = metadata(project.metadata);
    const shots = Array.isArray(meta.shots) ? meta.shots as Shot[] : [];
    const activeShotId = body.shotId ?? (typeof meta.activeShotId === 'string' ? meta.activeShotId : 'shot-1');
    const shotIndex = shots.findIndex((shot) => shot.id === activeShotId);
    if (shotIndex < 0) throw new HttpError('샷을 찾을 수 없습니다', 404);
    const shot = shots[shotIndex];
    const existing = (meta.upscale as ActiveUpscale | undefined);
    if (existing?.runpodJobId && ACTIVE.has(existing.status ?? '')) {
      return ok({ jobId: existing.runpodJobId, status: existing.status, alreadyQueued: true });
    }

    const shotRender = shot.render as Record<string, unknown> | undefined;
    const projectRender = meta.render as Record<string, unknown> | undefined;
    const render = shotRender ?? projectRender;
    const sourceVideoUrl = typeof shot.videoUrl === 'string' ? shot.videoUrl : render?.videoUrl;
    if (!isPlaylabVideoUrl(sourceVideoUrl)) {
      throw new HttpError('먼저 완료된 원본 영상을 PLAYLAB 저장소에 보관한 뒤 업스케일할 수 있습니다', 409);
    }
    const aspect = typeof meta.aspectRatio === 'string' ? meta.aspectRatio : '9:16';
    const target = getVideoUpscaleTarget(aspect, body.tier);
    const outputId = randomUUID();
    const outputPath = `video-upscales/${project.id}/${activeShotId}/${outputId}.mp4`;
    const upload = await createVideoUpscaleUpload(outputPath);
    const prompt = typeof shot.prompt === 'string' ? shot.prompt : (typeof meta.prompt === 'string' ? meta.prompt : project.description);
    const ledger = await beginVideoUpscaleOperation({
      userId: user.id,
      engine: 'upscale',
      prompt: `[${target.label}] ${prompt}`,
      aspect,
      style: typeof meta.style === 'string' ? meta.style : null,
      creditCharge: getVideoUpscaleCredit(body.tier),
    });
    let job;
    try {
      job = await queueVideoUpscale({
        operation: 'seedvr2_video_upscale',
        source_url: sourceVideoUrl,
        target_width: target.width,
        target_height: target.height,
        model: 'seedvr2_ema_3b_fp8_e4m3fn.safetensors',
        output_upload: { signed_url: upload.signedUrl, content_type: upload.contentType },
      });
    } catch (error) {
      await finishVideoUpscaleOperation({ operationId: ledger.operationId, status: 'FAILED', error: error instanceof Error ? error.message : '업스케일 워커 요청 실패' });
      throw error;
    }
    const queuedAt = new Date().toISOString();
    const nextUpscale = {
      runpodJobId: job.id, status: job.status, accountingJobId: ledger.operationId, creditCharged: ledger.creditCharged,
      tier: body.tier, target, sourceVideoUrl, outputPath, outputUrl: videoUpscalePublicUrl(outputPath), queuedAt,
    };
    const existingUpscales = Array.isArray(shot.upscales) ? shot.upscales : [];
    const nextMeta = {
      ...meta,
      activeShotId,
      upscale: nextUpscale,
      shots: shots.map((candidate, index) => index === shotIndex ? { ...candidate, upscales: [...existingUpscales, nextUpscale] } : candidate),
    };
    await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(nextMeta) } });
    return ok({ jobId: job.id, status: job.status, tier: body.tier, target, creditCharged: ledger.creditCharged });
  } catch (error) {
    return fail(error);
  }
}
