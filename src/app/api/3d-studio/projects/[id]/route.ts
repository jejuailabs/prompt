import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { getRunpodJobStatus } from '@/lib/server/runpod';
import { parseMeta, toProject } from '../route';
import { finishMeteredOperation } from '@/lib/server/operation-ledger';
import { uploadBuffer } from '@/lib/server/storage';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    let project = await db.artifact.findFirst({ where: { id, ownerId: user.id, type: '3d_asset', sourceModule: '3d-studio' } });
    if (!project) throw new HttpError('3D 프로젝트를 찾을 수 없습니다', 404);
    const meta = parseMeta(project.metadata);
    const jobId = meta.blender?.jobId;
    const terminalStates = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'];
    if (jobId && !terminalStates.includes(meta.blender?.status ?? '')) {
      const engine = meta.blender?.engine === 'trellis' ? 'trellis' : 'blender';
      const job = await getRunpodJobStatus(engine, jobId);
      let status = job.status;
      let error = job.error;
      let outputs = meta.outputs ?? [];
      if (status === 'COMPLETED') {
        const output = job.output as { model?: unknown; error?: unknown } | undefined;
        if (typeof output?.error === 'string') {
          status = 'FAILED';
          error = output.error;
        } else if (engine !== 'trellis' || typeof output?.model !== 'string') {
          status = 'FAILED';
          error = '생성 워커가 GLB 모델을 반환하지 않았습니다.';
        } else {
          const model = Buffer.from(output.model, 'base64');
          if (model.length < 20 || model.length > 50 * 1024 * 1024 || model.toString('ascii', 0, 4) !== 'glTF' || model.readUInt32LE(4) !== 2 || model.readUInt32LE(8) !== model.length) {
            status = 'FAILED';
            error = '유효한 GLB 2.0 파일이 아닙니다.';
          } else {
            // A storage failure remains retryable: do not finalize billing until
            // the model is durably saved. Repeated GETs reuse the same path.
            const glbUrl = await uploadBuffer(`3d/${user.id}/${id}/${jobId}.glb`, model, 'model/gltf-binary');
            outputs = [{ id: jobId, projectId: id, glbUrl, thumbnailUrl: meta.inputImageUrls?.[0], createdAt: new Date().toISOString() }];
          }
        }
      }
      await finishMeteredOperation({ operationId: meta.blender?.accountingJobId, engine, status, executionTimeMs: job.executionTime, error });
      const terminal = terminalStates.includes(status);
      const nextMeta = { ...meta, blender: { ...meta.blender, status, ...(error ? { error } : {}) }, outputs };
      project = await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify(nextMeta), status: terminal ? status === 'COMPLETED' ? 'done' : 'failed' : status === 'IN_PROGRESS' ? 'processing' : 'generating' } });
    }
    return ok(toProject(project));
  } catch (error) {
    return fail(error);
  }
}
