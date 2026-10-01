import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { getRunpodJobStatus, type RunpodVideoEngine } from '@/lib/server/runpod';
import { uploadBuffer } from '@/lib/server/storage';
import { finishMeteredOperation } from '@/lib/server/operation-ledger';

function metadata(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

interface VideoResult { url?: string; base64?: string; contentType?: string; filename?: string }
interface ImageResult { url?: string; base64?: string; contentType?: string; filename?: string }

function findVideo(value: unknown): VideoResult | null {
  if (typeof value === 'string') {
    if (/^data:video\/(mp4|webm|quicktime);base64,/i.test(value)) {
      const [header, base64] = value.split(',', 2);
      return { base64, contentType: header.slice(5, header.indexOf(';')), filename: 'render.mp4' };
    }
    return /\.(mp4|webm|mov)(?:\?|$)/i.test(value) ? { url: value } : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) { const found = findVideo(item); if (found) return found; }
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.data === 'string' && typeof record.filename === 'string' && /\.(mp4|webm|mov)$/i.test(record.filename)) {
      return { base64: record.data.replace(/^data:[^,]+,/, ''), filename: record.filename, contentType: record.filename.endsWith('.webm') ? 'video/webm' : record.filename.endsWith('.mov') ? 'video/quicktime' : 'video/mp4' };
    }
    for (const item of Object.values(record)) { const found = findVideo(item); if (found) return found; }
  }
  return null;
}

function findLastFrame(value: unknown): ImageResult | null {
  if (typeof value === 'string') {
    if (/^data:image\/(png|jpeg|webp);base64,/i.test(value)) {
      const [header, base64] = value.split(',', 2);
      return { base64, contentType: header.slice(5, header.indexOf(';')), filename: 'last-frame.png' };
    }
    return /(?:last[-_]frame|continuity[-_]frame).*\.(png|jpe?g|webp)(?:\?|$)/i.test(value) ? { url: value } : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) { const found = findLastFrame(item); if (found) return found; }
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const filename = typeof record.filename === 'string' ? record.filename : '';
    if (typeof record.data === 'string' && /(?:last[-_]frame|continuity[-_]frame).*\.(png|jpe?g|webp)$/i.test(filename)) {
      return { base64: record.data.replace(/^data:[^,]+,/, ''), filename, contentType: filename.endsWith('.webp') ? 'image/webp' : filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'image/png' };
    }
    for (const item of Object.values(record)) { const found = findLastFrame(item); if (found) return found; }
  }
  return null;
}

async function materializeVideo(output: unknown, jobId: string): Promise<string | null> {
  const result = findVideo(output);
  if (!result) return null;
  if (result.url) return result.url;
  if (!result.base64) return null;
  const data = Buffer.from(result.base64, 'base64');
  if (!data.length || data.length > 100 * 1024 * 1024) return null;
  const extension = result.contentType === 'video/webm' ? 'webm' : result.contentType === 'video/quicktime' ? 'mov' : 'mp4';
  return uploadBuffer(`video-renders/${jobId}.${extension}`, data, result.contentType ?? 'video/mp4');
}

async function materializeLastFrame(output: unknown, jobId: string): Promise<string | null> {
  const result = findLastFrame(output);
  if (!result) return null;
  if (result.url) return result.url;
  if (!result.base64) return null;
  const data = Buffer.from(result.base64, 'base64');
  if (!data.length || data.length > 8 * 1024 * 1024) return null;
  const extension = result.contentType === 'image/webp' ? 'webp' : result.contentType === 'image/jpeg' ? 'jpg' : 'png';
  return uploadBuffer(`video-renders/${jobId}.last-frame.${extension}`, data, result.contentType ?? 'image/png');
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);

    const meta = metadata(project.metadata);
    const render = meta.render as { engine?: RunpodVideoEngine; h3Gpu?: '5090' | 'blackwell'; runpodJobId?: string; accountingJobId?: string; status?: string; videoUrl?: string; error?: string; executionTime?: number; delayTime?: number; queuedAt?: string } | undefined;
    if (!render?.engine || !render.runpodJobId) throw new HttpError('진행 중인 렌더 작업이 없습니다', 404);
    // RunPod expires job results. Persisted terminal state must survive revisits.
    if ((render.status === 'COMPLETED' && render.videoUrl) || ['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(render.status ?? '')) {
      await finishMeteredOperation({ operationId: render.accountingJobId, engine: render.engine, status: render.status!, executionTimeMs: render.executionTime, error: render.error });
      return ok({ id: render.runpodJobId, status: render.status, videoUrl: render.videoUrl ?? null, error: render.error, executionTime: render.executionTime, delayTime: render.delayTime });
    }
    const job = await getRunpodJobStatus(render.engine, render.runpodJobId, render.h3Gpu).catch(error => {
      const age = Date.now() - Date.parse(render.queuedAt ?? project.createdAt.toISOString());
      if (error instanceof Error && error.message.startsWith('Runpod API 404:') && age > 86400000) {
        return { id: render.runpodJobId!, status: 'FAILED', error: '오래된 작업의 서버 기록이 만료되어 결과를 복구할 수 없습니다. 자동 재생성하지 않습니다.', output: undefined, executionTime: undefined, delayTime: undefined };
      }
      throw error;
    });
    console.log(`[render-status] job=${render.runpodJobId} engine=${render.engine} status=${job.status} delay=${job.delayTime}ms exec=${job.executionTime}ms error=${job.error ?? 'none'}`);
    const terminal = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(job.status);
    let videoUrl: string | null = null;
    if (terminal) {
      videoUrl = job.status === 'COMPLETED' ? await materializeVideo(job.output, job.id) : null;
      if (job.status === 'COMPLETED' && !videoUrl) {
        job.status = 'FAILED';
        job.error = '워커가 종료됐지만 재생 가능한 영상이 반환되지 않았습니다.';
      }
      const lastFrameUrl = job.status === 'COMPLETED' ? await materializeLastFrame(job.output, job.id) : null;
      const activeShotId = typeof meta.activeShotId === 'string' ? meta.activeShotId : 'shot-1';
      const shots = Array.isArray(meta.shots) ? meta.shots as Array<Record<string, unknown>> : [];
      const nextMeta = { ...meta, projectStatus: job.status === 'COMPLETED' ? 'completed' : 'failed', shots: shots.map(shot => shot.id === activeShotId ? { ...shot, status: job.status === 'COMPLETED' ? 'completed' : 'failed', videoUrl, lastFrameUrl, render: { ...(shot.render as Record<string, unknown> ?? render), status: job.status, completedAt: new Date().toISOString(), outputReceived: Boolean(job.output), error: job.error, videoUrl, lastFrameUrl, executionTime: job.executionTime, delayTime: job.delayTime } } : shot), render: { ...render, status: job.status, completedAt: new Date().toISOString(), outputReceived: Boolean(job.output), error: job.error, videoUrl, lastFrameUrl, executionTime: job.executionTime, delayTime: job.delayTime } };
      const saved = await db.artifact.updateMany({ where: { id: project.id, metadata: project.metadata }, data: { metadata: JSON.stringify(nextMeta), status: job.status === 'COMPLETED' ? 'completed' : 'failed', ...(videoUrl ? { fileUrl: videoUrl } : {}) } });
      if (!saved.count) throw new HttpError('작업 상태가 변경됐습니다. 다시 확인해주세요.', 409);
    }
    await finishMeteredOperation({ operationId: render.accountingJobId, engine: render.engine, status: job.status, executionTimeMs: job.executionTime, error: job.error });
    return ok({ id: job.id, status: job.status, delayTime: job.delayTime, executionTime: job.executionTime, error: job.error, videoUrl });
  } catch (error) {
    return fail(error);
  }
}
