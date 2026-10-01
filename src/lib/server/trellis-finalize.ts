import { db } from '@/lib/db';
import { inspectTrellisGlb } from '@/lib/server/asset3d-qc';
import { queueSkinTokensRigging, updateWorkflowStage } from '@/lib/server/asset3d-character';
import { finishMeteredOperation } from '@/lib/server/operation-ledger';
import type { RunpodJobStatus } from '@/lib/server/runpod';
import { downloadBuffer, publicStorageUrl, uploadBuffer } from '@/lib/server/storage';
import type { ProjectMeta } from '@/app/api/3d-studio/projects/route';

/** Persist a terminal TRELLIS result independently of the user's browser session. */
export async function finalizeTrellisProject(projectId: string, ownerId: string, job: RunpodJobStatus) {
  const claimed = await db.artifact.updateMany({
    where: { id: projectId, ownerId, type: '3d_asset', sourceModule: '3d-studio', status: { in: ['generating', 'processing'] } },
    data: { status: 'settling' },
  });
  let project = await db.artifact.findFirst({ where: { id: projectId, ownerId, type: '3d_asset', sourceModule: '3d-studio' } });
  if (!project) throw new Error('3D project missing during settlement');
  if (claimed.count !== 1) return project;

  const meta = JSON.parse(project.metadata) as ProjectMeta;
  if (meta.blender?.jobId !== job.id || meta.blender.engine !== 'trellis') {
    await db.artifact.update({ where: { id: projectId }, data: { status: 'generating' } });
    throw new Error('TRELLIS job does not match project');
  }
  const completedAt = new Date().toISOString();
  try {
    const output = job.output as { model?: unknown; model_upload?: { bytes?: unknown }; error?: unknown } | undefined;
    let error = job.error || (typeof output?.error === 'string' ? output.error : '');
    let model: Buffer | null = null;
    let glbUrl: string | null = null;
    let qc: ReturnType<typeof inspectTrellisGlb> | null = null;
    if (job.status === 'COMPLETED' && !error) {
      if (output?.model_upload && meta.blender.outputPath) {
        const uploaded = await downloadBuffer(meta.blender.outputPath);
        if (output.model_upload.bytes !== uploaded.length) throw new Error('Uploaded GLB size does not match worker receipt');
        model = uploaded;
        glbUrl = publicStorageUrl(meta.blender.outputPath);
      } else if (typeof output?.model === 'string') {
        model = Buffer.from(output.model, 'base64');
        glbUrl = await uploadBuffer(`3d/${ownerId}/${projectId}/${job.id}.glb`, model, 'model/gltf-binary');
      } else {
        error = '3D 워커가 모델 파일을 반환하지 않았습니다.';
      }
      if (model) {
        try {
          qc = inspectTrellisGlb(model);
          if (qc.status === 'rejected') {
            error = qc.errors.includes('flat_geometry')
              ? '입체 캐릭터가 아닌 납작한 형상이 생성되어 품질 검사에서 중단했습니다.'
              : '생성된 메시가 최소 형상 검사를 통과하지 못했습니다.';
          }
        } catch (failure) {
          error = failure instanceof Error ? failure.message : '3D 형상 검증에 실패했습니다.';
        }
      }
    }
    if (job.status !== 'COMPLETED' || error || !model || !glbUrl || !qc) {
      error ||= `Runpod ${job.status}`;
      await finishMeteredOperation({ operationId: meta.blender.accountingJobId, engine: 'trellis', status: 'FAILED', error });
      const workflowStages = updateWorkflowStage(meta.workflowStages, 'trellis', { status: 'failed', error, completedAt });
      project = await db.artifact.update({ where: { id: projectId }, data: { status: 'failed', metadata: JSON.stringify({ ...meta, workflowStages, blender: { ...meta.blender, status: 'FAILED', error, completedAt } }) } });
      return project;
    }

    const outputs = [{ id: job.id, projectId, glbUrl, thumbnailUrl: meta.inputImageUrls?.[0], polyCount: qc.triangles, dimensions: qc.dimensions, qcResult: { ...qc }, createdAt: completedAt }];
    const completedStages = updateWorkflowStage(meta.workflowStages, 'trellis', { status: 'completed', completedAt, previewGlbUrl: glbUrl });
    let workflowStages = updateWorkflowStage(completedStages, 'rigging_animation', { status: 'awaiting_approval' });
    let rigging: typeof meta.rigging;
    let status = 'done';
    if (meta.workflowMode === 'automatic') {
      try {
        const next = await queueSkinTokensRigging({ model, ownerId, projectId, heightMeters: meta.riggingSettings?.heightMeters });
        workflowStages = updateWorkflowStage(completedStages, 'rigging_animation', { status: 'running', startedAt: completedAt });
        rigging = { provider: 'skintokens', jobId: next.id, status: next.status, queuedAt: completedAt, outputPaths: next.outputPaths, outputUrls: next.outputUrls };
        status = 'processing';
      } catch (failure) {
        workflowStages = updateWorkflowStage(completedStages, 'rigging_animation', { status: 'awaiting_approval', error: failure instanceof Error ? failure.message : '자동 리깅을 시작하지 못했습니다.' });
      }
    }
    await finishMeteredOperation({ operationId: meta.blender.accountingJobId, engine: 'trellis', status: 'COMPLETED', executionTimeMs: job.executionTime });
    project = await db.artifact.update({ where: { id: projectId }, data: {
      status,
      metadata: JSON.stringify({ ...meta, outputs, workflowStages, ...(rigging ? { rigging } : {}), blender: { ...meta.blender, status: 'COMPLETED', completedAt, delayTimeMs: job.delayTime, executionTimeMs: job.executionTime } }),
    } });
    return project;
  } catch (failure) {
    await db.artifact.updateMany({ where: { id: projectId, status: 'settling' }, data: { status: 'generating' } });
    throw failure;
  }
}
