import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { getRunpodJobStatus } from '@/lib/server/runpod';
import { parseMeta, toProject } from '../route';
import { finishMeteredOperation } from '@/lib/server/operation-ledger';
import { uploadBuffer } from '@/lib/server/storage';
import { inspectTrellisGlb } from '@/lib/server/asset3d-qc';

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
          let qc;
          try { qc = inspectTrellisGlb(model); } catch (failure) {
            status = 'FAILED';
            error = failure instanceof Error ? failure.message : '3D 형상 검증에 실패했습니다.';
          }
          if (qc?.status === 'rejected') {
            status = 'FAILED';
            error = qc.errors.includes('flat_geometry') ? '입체 캐릭터가 아닌 납작한 형상이 생성되어 품질 검사에서 중단했습니다. 같은 이미지로 자동 재시도하지 않습니다.' : '생성된 메시가 최소 형상 검사를 통과하지 못했습니다.';
          }
          if (qc && status === 'COMPLETED') {
            // A storage failure remains retryable: do not finalize billing until
            // the model is durably saved. Repeated GETs reuse the same path.
            const glbUrl = await uploadBuffer(`3d/${user.id}/${id}/${jobId}.glb`, model, 'model/gltf-binary');
            outputs = [{ id: jobId, projectId: id, glbUrl, thumbnailUrl: meta.inputImageUrls?.[0], polyCount: qc.triangles, dimensions: qc.dimensions, qcResult: { ...qc }, createdAt: new Date().toISOString() }];
          }
        }
      }
      await finishMeteredOperation({ operationId: meta.blender?.accountingJobId, engine, status, executionTimeMs: job.executionTime, error });
      const terminal = terminalStates.includes(status);
      const nextMeta = { ...meta, blender: { ...meta.blender, status, delayTimeMs: job.delayTime, executionTimeMs: job.executionTime, ...(terminal ? { completedAt: new Date().toISOString() } : {}), ...(error ? { error } : {}) }, outputs };
      project = await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify(nextMeta), status: terminal ? status === 'COMPLETED' ? 'done' : 'failed' : status === 'IN_PROGRESS' ? 'processing' : 'generating' } });
    }
    return ok(toProject(project));
  } catch (error) {
    return fail(error);
  }
}
