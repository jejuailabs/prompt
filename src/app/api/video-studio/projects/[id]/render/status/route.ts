import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { getRunpodJobStatus, type RunpodVideoEngine } from '@/lib/server/runpod';

function metadata(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

function findVideoUrl(value: unknown): string | null {
  if (typeof value === 'string') return /\.(mp4|webm|mov)(?:\?|$)/i.test(value) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) { const found = findVideoUrl(item); if (found) return found; }
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) { const found = findVideoUrl(item); if (found) return found; }
  }
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);

    const meta = metadata(project.metadata);
    const render = meta.render as { engine?: RunpodVideoEngine; runpodJobId?: string } | undefined;
    if (!render?.engine || !render.runpodJobId) throw new HttpError('진행 중인 렌더 작업이 없습니다', 404);
    const job = await getRunpodJobStatus(render.engine, render.runpodJobId);
    const terminal = job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED';
    if (terminal) {
      const videoUrl = job.status === 'COMPLETED' ? findVideoUrl(job.output) : null;
      const nextMeta = { ...meta, projectStatus: job.status === 'COMPLETED' ? 'completed' : 'failed', render: { ...render, status: job.status, completedAt: new Date().toISOString(), output: job.output, error: job.error, videoUrl } };
      await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(nextMeta), status: job.status === 'COMPLETED' ? 'completed' : 'failed', ...(videoUrl ? { fileUrl: videoUrl } : {}) } });
    }
    return ok({ id: job.id, status: job.status, delayTime: job.delayTime, executionTime: job.executionTime, output: job.output, error: job.error });
  } catch (error) {
    return fail(error);
  }
}
