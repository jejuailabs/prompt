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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);

    const meta = metadata(project.metadata);
    const render = meta.render as { engine?: RunpodVideoEngine; runpodJobId?: string; accountingJobId?: string } | undefined;
    if (!render?.engine || !render.runpodJobId) throw new HttpError('진행 중인 렌더 작업이 없습니다', 404);
    const job = await getRunpodJobStatus(render.engine, render.runpodJobId);
    await finishMeteredOperation({ operationId: render.accountingJobId, engine: render.engine, status: job.status, executionTimeMs: job.executionTime, error: job.error });
    const terminal = job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED';
    let videoUrl: string | null = null;
    if (terminal) {
      videoUrl = job.status === 'COMPLETED' ? await materializeVideo(job.output, job.id) : null;
      const nextMeta = { ...meta, projectStatus: job.status === 'COMPLETED' ? 'completed' : 'failed', render: { ...render, status: job.status, completedAt: new Date().toISOString(), outputReceived: Boolean(job.output), error: job.error, videoUrl } };
      await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(nextMeta), status: job.status === 'COMPLETED' ? 'completed' : 'failed', ...(videoUrl ? { fileUrl: videoUrl } : {}) } });
    }
    return ok({ id: job.id, status: job.status, delayTime: job.delayTime, executionTime: job.executionTime, error: job.error, videoUrl });
  } catch (error) {
    return fail(error);
  }
}
