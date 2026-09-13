import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { getRunpodJobStatus } from '@/lib/server/runpod';
import { parseMeta, toProject } from '../route';
import { finishMeteredOperation } from '@/lib/server/operation-ledger';

function findUrl(value: unknown, pattern: RegExp): string | null {
  if (typeof value === 'string') return pattern.test(value) ? value : null;
  if (Array.isArray(value)) { for (const item of value) { const found = findUrl(item, pattern); if (found) return found; } }
  if (value && typeof value === 'object') { for (const item of Object.values(value as Record<string, unknown>)) { const found = findUrl(item, pattern); if (found) return found; } }
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    let project = await db.artifact.findFirst({ where: { id, ownerId: user.id, type: '3d_asset', sourceModule: '3d-studio' } });
    if (!project) throw new HttpError('3D 프로젝트를 찾을 수 없습니다', 404);
    const meta = parseMeta(project.metadata);
    const jobId = meta.blender?.jobId;
    if (jobId && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(meta.blender?.status ?? '')) {
      const job = await getRunpodJobStatus('blender', jobId);
      await finishMeteredOperation({ operationId: meta.blender?.accountingJobId, engine: 'blender', status: job.status, executionTimeMs: job.executionTime, error: job.error });
      const terminal = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status);
      const glbUrl = terminal && job.status === 'COMPLETED' ? findUrl(job.output, /\.glb(?:\?|$)/i) : null;
      const thumbnailUrl = terminal && job.status === 'COMPLETED' ? findUrl(job.output, /\.(png|jpe?g|webp)(?:\?|$)/i) : null;
      const nextMeta = { ...meta, blender: { ...meta.blender, status: job.status, ...(job.error ? { error: job.error } : {}) }, outputs: terminal && job.status === 'COMPLETED' ? [{ id: job.id, projectId: project.id, glbUrl: glbUrl ?? '', thumbnailUrl, createdAt: new Date().toISOString() }] : meta.outputs ?? [] };
      project = await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(nextMeta), status: terminal ? job.status === 'COMPLETED' ? 'done' : 'failed' : job.status === 'IN_PROGRESS' ? 'processing' : 'generating', ...(thumbnailUrl ? { fileUrl: thumbnailUrl } : {}) } });
    }
    return ok(toProject(project));
  } catch (error) {
    return fail(error);
  }
}
