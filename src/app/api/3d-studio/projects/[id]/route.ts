import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { getRunpodJobStatus } from '@/lib/server/runpod';
import { parseMeta, toProject } from '../route';
import { finishMeteredOperation } from '@/lib/server/operation-ledger';
import { uploadBuffer } from '@/lib/server/storage';
import { inspectRiggedGlb, inspectTrellisGlb } from '@/lib/server/asset3d-qc';
import { queueCharacterPreparation, queueSkinTokensRigging, updateWorkflowStage } from '@/lib/server/asset3d-character';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    let project = await db.artifact.findFirst({ where: { id, ownerId: user.id, type: '3d_asset', sourceModule: '3d-studio' } });
    if (!project) throw new HttpError('3D 프로젝트를 찾을 수 없습니다', 404);
    const meta = parseMeta(project.metadata);
    if (meta.rigging && !['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(meta.rigging.status)) {
      const job = await getRunpodJobStatus('rigging', meta.rigging.jobId);
      const progress = job.status === 'COMPLETED' ? 100 : typeof (job.output as { progress?: unknown } | undefined)?.progress === 'number' ? (job.output as { progress: number }).progress : 0;
      if (job.status === 'COMPLETED') {
        const files = (job.output as { files?: Record<string, unknown>; error?: unknown } | undefined)?.files;
        const riggedGlb = files?.['rigged.glb'];
        const riggedFbx = files?.['rigged.fbx'];
        if (typeof riggedGlb !== 'string' || typeof riggedFbx !== 'string') {
          const error = 'SkinTokens 리깅 워커가 rigged.glb와 rigged.fbx를 모두 반환하지 않았습니다.';
          const stages = updateWorkflowStage(meta.workflowStages, 'rigging_animation', { status: 'awaiting_approval', progress, error });
          project = await db.artifact.update({ where: { id }, data: { status: 'done', metadata: JSON.stringify({ ...meta, workflowStages: stages, rigging: { ...meta.rigging, status: 'FAILED', progress, error } }) } });
          return ok(toProject(project));
        }
        try {
          inspectRiggedGlb(Buffer.from(riggedGlb, 'base64'));
        } catch (failure) {
          const error = failure instanceof Error ? failure.message : '리깅 결과 검증에 실패했습니다.';
          const stages = updateWorkflowStage(meta.workflowStages, 'rigging_animation', { status: 'awaiting_approval', progress, error });
          project = await db.artifact.update({ where: { id }, data: { status: 'done', metadata: JSON.stringify({ ...meta, workflowStages: stages, rigging: { ...meta.rigging, status: 'FAILED', progress, error } }) } });
          return ok(toProject(project));
        }
        const root = `3d/${user.id}/${id}/rigging-${meta.rigging.jobId}`;
        const riggedGlbUrl = await uploadBuffer(`${root}/character-rigged.glb`, Buffer.from(riggedGlb, 'base64'), 'model/gltf-binary');
        const riggedFbxUrl = await uploadBuffer(`${root}/character-rigged.fbx`, Buffer.from(riggedFbx, 'base64'), 'application/octet-stream');
        const animationUrls: Record<string, string> = {};
        for (const [name, content] of Object.entries(files ?? {})) {
          if (!name.startsWith('animations/') || typeof content !== 'string') continue;
          animationUrls[name.slice('animations/'.length)] = await uploadBuffer(`${root}/${name}`, Buffer.from(content, 'base64'), name.endsWith('.glb') ? 'model/gltf-binary' : 'application/octet-stream');
        }
        const textureUrls: Record<string, string> = {};
        for (const [name, content] of Object.entries(files ?? {})) {
          if (/^textures\/[\w.-]+\.png$/.test(name) && typeof content === 'string') {
            textureUrls[name.slice(9)] = await uploadBuffer(`${root}/${name}`, Buffer.from(content, 'base64'), 'image/png');
          }
        }
        const outputs = (meta.outputs ?? []).map((output) => ({ ...output, riggedGlbUrl, riggedFbxUrl, animationUrls, textureUrls }));
        const completedAt = new Date().toISOString();
        const riggedStages = updateWorkflowStage(meta.workflowStages, 'rigging_animation', { status: 'completed', progress: 100, completedAt, previewGlbUrl: riggedGlbUrl, fbxUrl: riggedFbxUrl });
        const exportedStages = updateWorkflowStage(riggedStages, 'blender', { status: 'completed', completedAt, previewGlbUrl: riggedGlbUrl, fbxUrl: riggedFbxUrl });
        const finalStages = updateWorkflowStage(exportedStages, 'unity_bundle', { status: 'completed', completedAt, previewGlbUrl: riggedGlbUrl, fbxUrl: riggedFbxUrl });
        project = await db.artifact.update({ where: { id }, data: { status: 'done', metadata: JSON.stringify({ ...meta, outputs, workflowStages: finalStages, rigging: { ...meta.rigging, status: job.status, progress: 100, completedAt } }) } });
        return ok(toProject(project));
      }
      if (['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(job.status)) {
        const error = job.error || 'SkinTokens 자동 리깅이 휴머노이드 자세를 인식하지 못했습니다. 관절 보정 후 다시 시도하세요.';
        const stages = updateWorkflowStage(meta.workflowStages, 'rigging_animation', { status: 'awaiting_approval', progress, error });
        project = await db.artifact.update({ where: { id }, data: { status: 'done', metadata: JSON.stringify({ ...meta, workflowStages: stages, rigging: { ...meta.rigging, status: job.status, progress, error } }) } });
        return ok(toProject(project));
      }
      const stages = updateWorkflowStage(meta.workflowStages, 'rigging_animation', { status: 'running', progress });
      project = await db.artifact.update({ where: { id }, data: { status: 'processing', metadata: JSON.stringify({ ...meta, workflowStages: stages, rigging: { ...meta.rigging, status: job.status, progress } }) } });
      return ok(toProject(project));
    }
    const jobId = meta.blender?.jobId;
    const terminalStates = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'];
    if (jobId && !terminalStates.includes(meta.blender?.status ?? '')) {
      const engine = meta.blender?.engine === 'character_blender' ? 'character_blender' : 'trellis';
      const job = await getRunpodJobStatus(engine, jobId);
      let status = job.status;
      let error = job.error;
      let outputs = meta.outputs ?? [];
      if (status === 'COMPLETED') {
        const output = job.output as { model?: unknown; error?: unknown } | undefined;
        if (typeof output?.error === 'string') {
          status = 'FAILED';
          error = output.error;
        } else if (engine === 'trellis' && typeof output?.model === 'string') {
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

            const completedStages = updateWorkflowStage(meta.workflowStages, 'trellis', {
              status: 'completed', completedAt: new Date().toISOString(), previewGlbUrl: glbUrl,
            });
            const readyStages = updateWorkflowStage(completedStages, 'rigging_animation', {
              status: meta.workflowMode === 'guided' ? 'awaiting_approval' : 'pending',
            });

            if (meta.workflowMode === 'automatic') {
              try {
                const preparedJob = await queueSkinTokensRigging({ model, heightMeters: meta.riggingSettings?.heightMeters });
                const startedAt = new Date().toISOString();
                const nextStages = updateWorkflowStage(readyStages, 'rigging_animation', { status: 'running', startedAt });
                const nextMeta = { ...meta, outputs, workflowStages: nextStages, blender: { ...meta.blender, status: 'COMPLETED', completedAt: startedAt, delayTimeMs: job.delayTime, executionTimeMs: job.executionTime }, rigging: { provider: 'skintokens' as const, jobId: preparedJob.id, status: preparedJob.status, queuedAt: startedAt } };
                project = await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify(nextMeta), status: 'processing' } });
                await finishMeteredOperation({ operationId: meta.blender?.accountingJobId, engine, status, executionTimeMs: job.executionTime, error });
                return ok(toProject(project));
              } catch (startError) {
                const nextStages = updateWorkflowStage(readyStages, 'rigging_animation', { status: 'awaiting_approval', error: startError instanceof Error ? startError.message : '리깅 워커를 시작하지 못했습니다.' });
                const nextMeta = { ...meta, workflowStages: nextStages, outputs, blender: { ...meta.blender, status: 'COMPLETED', completedAt: new Date().toISOString(), delayTimeMs: job.delayTime, executionTimeMs: job.executionTime } };
                project = await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify(nextMeta), status: 'done' } });
                await finishMeteredOperation({ operationId: meta.blender?.accountingJobId, engine, status, executionTimeMs: job.executionTime, error });
                return ok(toProject(project));
              }
            }
            const nextMeta = { ...meta, workflowStages: readyStages, outputs, blender: { ...meta.blender, status: 'COMPLETED', completedAt: new Date().toISOString(), delayTimeMs: job.delayTime, executionTimeMs: job.executionTime } };
            project = await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify(nextMeta), status: 'done' } });
            await finishMeteredOperation({ operationId: meta.blender?.accountingJobId, engine, status, executionTimeMs: job.executionTime, error });
            return ok(toProject(project));
          }
        } else if (engine === 'character_blender' && output && typeof output === 'object' && !Array.isArray(output)) {
          const files = (output as { files?: Record<string, unknown> }).files;
          if (!files || typeof files['prepared.glb'] !== 'string' || typeof files['prepared.fbx'] !== 'string') {
            status = 'FAILED';
            error = 'Blender 준비 워커가 GLB와 FBX 번들을 반환하지 않았습니다.';
          } else {
            const root = `3d/${user.id}/${id}/${jobId}`;
            const preparedGlb = await uploadBuffer(`${root}/prepared.glb`, Buffer.from(files['prepared.glb'], 'base64'), 'model/gltf-binary');
            const preparedFbx = await uploadBuffer(`${root}/prepared.fbx`, Buffer.from(files['prepared.fbx'], 'base64'), 'application/octet-stream');
            const unityManifestUrl = typeof files['unity-materials.json'] === 'string'
              ? await uploadBuffer(`${root}/unity-materials.json`, Buffer.from(files['unity-materials.json'], 'base64'), 'application/json')
              : null;
            const textures: Record<string, string> = {};
            for (const [name, content] of Object.entries(files)) {
              if (name.startsWith('textures/') && typeof content === 'string') {
                textures[name.slice('textures/'.length)] = await uploadBuffer(`${root}/${name}`, Buffer.from(content, 'base64'), 'image/png');
              }
            }
            const existing = outputs[0];
            outputs = [{ ...(existing ?? { id: jobId, projectId: id, thumbnailUrl: meta.inputImageUrls?.[0], createdAt: new Date().toISOString() }), id: jobId, glbUrl: preparedGlb, fbxUrl: preparedFbx, textureUrls: textures, unityManifestUrl }];
            const blenderDone = updateWorkflowStage(meta.workflowStages, 'blender', { status: 'completed', completedAt: new Date().toISOString(), previewGlbUrl: preparedGlb, fbxUrl: preparedFbx, textureUrls: textures });
            const readyStages = updateWorkflowStage(blenderDone, 'rigging_animation', { status: meta.workflowMode === 'guided' ? 'awaiting_approval' : 'pending', previewGlbUrl: preparedGlb });
            if (meta.workflowMode === 'automatic') {
              try {
                const preparedModel = Buffer.from(files['prepared.glb'], 'base64');
                const riggingJob = await queueSkinTokensRigging({ model: preparedModel, heightMeters: meta.riggingSettings?.heightMeters });
                const queuedAt = new Date().toISOString();
                const runningStages = updateWorkflowStage(readyStages, 'rigging_animation', { status: 'running', progress: 0, startedAt: queuedAt });
                const nextMeta = { ...meta, outputs, workflowStages: runningStages, blender: { ...meta.blender, status: 'COMPLETED', completedAt: queuedAt, delayTimeMs: job.delayTime, executionTimeMs: job.executionTime }, rigging: { provider: 'skintokens' as const, jobId: riggingJob.id, status: riggingJob.status, progress: 0, queuedAt } };
                project = await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify(nextMeta), status: 'processing' } });
                return ok(toProject(project));
              } catch (startError) {
                const waitingStages = updateWorkflowStage(readyStages, 'rigging_animation', { status: 'awaiting_approval', error: startError instanceof Error ? startError.message : '자동 리깅을 시작하지 못했습니다.' });
                const nextMeta = { ...meta, outputs, workflowStages: waitingStages, blender: { ...meta.blender, status: 'COMPLETED', completedAt: new Date().toISOString(), delayTimeMs: job.delayTime, executionTimeMs: job.executionTime } };
                project = await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify(nextMeta), status: 'done' } });
                return ok(toProject(project));
              }
            }
            const nextMeta = { ...meta, workflowStages: readyStages, outputs, blender: { ...meta.blender, status: 'COMPLETED', completedAt: new Date().toISOString(), delayTimeMs: job.delayTime, executionTimeMs: job.executionTime } };
            project = await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify(nextMeta), status: 'done' } });
            return ok(toProject(project));
          }
        } else {
          status = 'FAILED';
          error = '생성 워커가 필요한 결과 파일을 반환하지 않았습니다.';
        }
      }
      if (engine === 'trellis') {
        await finishMeteredOperation({ operationId: meta.blender?.accountingJobId, engine, status, executionTimeMs: job.executionTime, error });
      }
      const terminal = terminalStates.includes(status);
      const nextMeta = { ...meta, blender: { ...meta.blender, status, delayTimeMs: job.delayTime, executionTimeMs: job.executionTime, ...(terminal ? { completedAt: new Date().toISOString() } : {}), ...(error ? { error } : {}) }, outputs };
      project = await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify(nextMeta), status: terminal ? status === 'COMPLETED' ? 'done' : 'failed' : status === 'IN_PROGRESS' ? 'processing' : 'generating' } });
    }
    return ok(toProject(project));
  } catch (error) {
    return fail(error);
  }
}
