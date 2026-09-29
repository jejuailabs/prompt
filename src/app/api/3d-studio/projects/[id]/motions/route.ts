import { z } from 'zod';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { loadMotionLibrary } from '@/lib/server/motion-library';
import { queueRunpodJob, getRunpodJobStatus, cancelRunpodJob } from '@/lib/server/runpod';
import { inspectRiggedGlb } from '@/lib/server/asset3d-qc';
import { createSignedWorkerUploads, downloadBuffer, publicStorageUrl, uploadBuffer } from '@/lib/server/storage';
import { parseMeta } from '../../route';
import { updateWorkflowStage } from '@/lib/server/asset3d-character';

const roles = ['Hips', 'Spine', 'Head', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand', 'RightUpperArm', 'RightLowerArm', 'RightHand', 'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot', 'RightUpperLeg', 'RightLowerLeg', 'RightFoot'] as const;
const requiredRoles = roles.filter(role => !['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot'].includes(role));
const requestSchema = z.object({
  requestId: z.string().uuid(), motionId: z.string().regex(/^[a-z0-9_-]{1,64}$/),
  boneMapping: z.record(z.string(), z.string().min(1).max(120)).refine(mapping =>
    requiredRoles.every(role => Boolean(mapping[role])) &&
    Object.keys(mapping).every(role => roles.includes(role as typeof roles[number])) &&
    new Set(Object.values(mapping)).size === Object.values(mapping).length,
  ), inPlace: z.boolean().default(true),
});
interface MotionJob { projectId: string; motionId: string; jobId?: string; queuedAt: string; error?: string; previewGlbUrl?: string; fbxUrl?: string; executionTimeMs?: number; outputPaths?: Record<string, string>; boneMapping?: Record<string, string>; inPlace?: boolean; }

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = requestSchema.safeParse(await readJson(req));
    if (!body.success) throw new HttpError('모션과 몸통·팔·다리의 핵심 관절 매핑을 확인해주세요.', 400);
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, type: '3d_asset' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다.', 404);
    const previous = await db.artifact.findUnique({ where: { id: body.data.requestId } });
    if (previous) {
      if (previous.ownerId !== user.id || previous.type !== '3d_motion' || JSON.parse(previous.metadata).projectId !== id) throw new HttpError('요청 ID가 이미 사용되었습니다.', 409);
      return ok({ id: previous.id, status: previous.status, ...JSON.parse(previous.metadata) });
    }
    const existingMotions = await db.artifact.findMany({ where: { ownerId: user.id, type: '3d_motion', sourceModule: '3d-studio' }, select: { status: true, metadata: true } });
    const projectMotions = existingMotions.filter(row => { try { return JSON.parse(row.metadata).projectId === id; } catch { return false; } });
    if (projectMotions.some(row => ['submitting', 'processing'].includes(row.status))) throw new HttpError('진행 중인 애니메이션이 끝난 뒤 다음 동작을 적용해주세요.', 409);
    if (user.role !== 'admin' && projectMotions.filter(row => row.status === 'done').length >= 3) throw new HttpError('한 캐릭터에는 애니메이션을 최대 3개까지 적용할 수 있습니다.', 409);
    const source = parseMeta(project.metadata).outputs?.[0]?.riggedGlbUrl;
    if (!source) throw new HttpError('먼저 스킨 웨이트가 포함된 리깅을 완료해주세요.', 409);
    const sourceUrl = new URL(source);
    if (sourceUrl.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin || !sourceUrl.pathname.startsWith('/storage/v1/object/public/uploads/3d/')) throw new HttpError('캐릭터 파일 저장 경로를 확인해주세요.', 400);
    const { storage, motions } = await loadMotionLibrary();
    const motion = motions.find(m => m.id === body.data.motionId);
    if (!motion) throw new HttpError('등록된 모션을 찾을 수 없습니다.', 404);
    const { data: fbx, error } = await storage.download(motion.file);
    if (error || !fbx) throw new HttpError('모션 FBX를 읽지 못했습니다.', 502);
    if (fbx.size > 28_000_000) throw new HttpError('모션 FBX는 28MB 이하여야 합니다.', 400);
    const { data: motionAccess, error: accessError } = await storage.createSignedUrl(motion.file, 3600);
    if (accessError || !motionAccess?.signedUrl) throw new HttpError('모션 파일 접근 주소를 만들지 못했습니다.', 502);
    const response = await fetch(sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new HttpError('캐릭터 파일을 읽지 못했습니다.', 502);
    const model = Buffer.from(await response.arrayBuffer());
    if (model.length > 50_000_000) throw new HttpError('캐릭터가 너무 큽니다.', 400);
    inspectRiggedGlb(model);
    const root = `3d/${user.id}/${id}/motions/${body.data.requestId}`;
    const uploads = await createSignedWorkerUploads({
      'preview.glb': { path: `${root}/preview.glb`, contentType: 'model/gltf-binary' },
      'character.fbx': { path: `${root}/character.fbx`, contentType: 'application/octet-stream' },
    });
    const meta: MotionJob = { projectId: id, motionId: motion.id, queuedAt: new Date().toISOString(), boneMapping: body.data.boneMapping, inPlace: body.data.inPlace,
      outputPaths: Object.fromEntries(Object.entries(uploads).map(([name, upload]) => [name, upload.path])) };
    // Unique request ID is acquired before submitting any paid operation.
    await db.artifact.create({ data: { id: body.data.requestId, ownerId: user.id, type: '3d_motion', sourceModule: '3d-studio', title: motion.name, status: 'submitting', visibility: 'private', metadata: JSON.stringify(meta) } });
    try {
      const job = await queueRunpodJob('rigging', { operation: 'retarget', model_url: sourceUrl.toString(), motion_url: motionAccess.signedUrl, bone_mapping: body.data.boneMapping, clip_name: motion.name, in_place: body.data.inPlace,
        output_uploads: Object.fromEntries(Object.entries(uploads).map(([name, upload]) => [name, { signed_url: upload.signedUrl, content_type: upload.contentType }])) });
      meta.jobId = job.id;
      await db.artifact.update({ where: { id: body.data.requestId }, data: { status: 'processing', metadata: JSON.stringify(meta) } });
      return ok({ id: body.data.requestId, status: 'processing', ...meta });
    } catch {
      // An ambiguous transport failure must never trigger an automatic duplicate paid job.
      await db.artifact.update({ where: { id: body.data.requestId }, data: { status: 'failed', metadata: JSON.stringify({ ...meta, error: '작업 접수 결과를 확인하지 못했습니다. 관리자가 RunPod 요청 내역을 확인해야 합니다.' }) } });
      throw new HttpError('모션 작업 접수 확인에 실패했습니다. 자동 재시도하지 않습니다.', 502);
    }
  } catch (error) { return fail(error); }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params;
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, type: '3d_asset' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다.', 404);
    const rows = await db.artifact.findMany({ where: { ownerId: user.id, type: '3d_motion', sourceModule: '3d-studio' }, orderBy: { createdAt: 'desc' }, take: 100 });
    const results: Array<MotionJob & { id: string; name: string; status: string }> = [];
    for (const row of rows) {
      const meta: MotionJob = JSON.parse(row.metadata);
      if (meta.projectId !== id) continue;
      let status = row.status;
      if (status === 'processing' && meta.jobId) {
        const job = await getRunpodJobStatus('rigging', meta.jobId);
        if (job.status === 'COMPLETED') {
          try {
            const output = job.output as { files?: Record<string, string>; uploads?: Record<string, unknown>; worker_error?: string } | undefined;
            if (output?.worker_error) throw new Error(output.worker_error);
            const files = output?.files;
            const signed = meta.outputPaths?.['preview.glb'] && meta.outputPaths?.['character.fbx'] && output?.uploads?.['preview.glb'] && output?.uploads?.['character.fbx'];
            if (!signed && (!files?.['preview.glb'] || !files?.['character.fbx'])) throw new Error('GLB/FBX 결과가 누락되었습니다.');
            const [glb, fbx] = signed ? await Promise.all([downloadBuffer(meta.outputPaths!['preview.glb']), downloadBuffer(meta.outputPaths!['character.fbx'])])
              : [Buffer.from(files!['preview.glb'], 'base64'), Buffer.from(files!['character.fbx'], 'base64')];
            if (!inspectRiggedGlb(glb).animations) throw new Error('결과에 실제 애니메이션 클립이 없습니다.');
            const root = `3d/${user.id}/${id}/motions/${row.id}`;
            meta.previewGlbUrl = signed ? publicStorageUrl(meta.outputPaths!['preview.glb']) : await uploadBuffer(`${root}/preview.glb`, glb, 'model/gltf-binary');
            meta.fbxUrl = signed ? publicStorageUrl(meta.outputPaths!['character.fbx']) : await uploadBuffer(`${root}/character.fbx`, fbx, 'application/octet-stream');
            meta.executionTimeMs = job.executionTime; status = 'done';
            const latestProject = await db.artifact.findUnique({ where: { id }, select: { metadata: true } });
            const projectMeta = parseMeta(latestProject?.metadata ?? project.metadata);
            const outputs = (projectMeta.outputs ?? []).map((output) => ({
              ...output,
              animationUrls: { ...(output.animationUrls ?? {}), [`${row.id}.glb`]: meta.previewGlbUrl!, [`${row.id}.fbx`]: meta.fbxUrl! },
              animationNames: { ...(output.animationNames ?? {}), [row.id]: row.title },
            }));
            const completedAt = new Date().toISOString();
            const animatedStages = updateWorkflowStage(projectMeta.workflowStages, 'animation', { status: 'completed', completedAt, previewGlbUrl: meta.previewGlbUrl, fbxUrl: meta.fbxUrl });
            const finalStages = updateWorkflowStage(animatedStages, 'unity_bundle', { status: 'completed', completedAt, previewGlbUrl: meta.previewGlbUrl, fbxUrl: meta.fbxUrl });
            await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify({ ...projectMeta, outputs, workflowStages: finalStages }) } });
          } catch (error) { status = 'failed'; meta.error = error instanceof Error ? error.message : '모션 출력 검증 실패'; }
        } else if (['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(job.status)) { status = 'failed'; meta.error = '모션 적용 실패: 관절 매핑과 워커 로그를 확인해주세요.'; }
        if (status !== 'processing') await db.artifact.update({ where: { id: row.id }, data: { status, metadata: JSON.stringify(meta) } });
      }
      // Older completed jobs stored the mapping only in the worker report.
      if (status === 'done' && !meta.boneMapping && meta.jobId) {
        try {
          const job = await getRunpodJobStatus('rigging', meta.jobId);
          const report = (job.output as { report?: { mapping?: Record<string, string>; in_place?: boolean } } | undefined)?.report;
          if (report?.mapping && requiredRoles.every(role => report.mapping?.[role])) {
            meta.boneMapping = report.mapping;
            meta.inPlace = report.in_place;
            await db.artifact.update({ where: { id: row.id }, data: { metadata: JSON.stringify(meta) } });
          }
        } catch { /* Expired provider history leaves the completed artifact usable. */ }
      }
      results.push({ id: row.id, name: row.title, status, ...meta });
    }
    // Give older exported motion files human readable names too.
    if (results.some(result => result.status === 'done')) {
      const freshProject = await db.artifact.findUnique({ where: { id }, select: { metadata: true } });
      const projectMeta = parseMeta(freshProject?.metadata ?? project.metadata);
      const names = Object.fromEntries(results.filter(result => result.status === 'done').map(result => [result.id, result.name]));
      const missing = (projectMeta.outputs ?? []).some(output => Object.keys(output.animationUrls ?? {}).some(file => names[file.split('.')[0]] && !output.animationNames?.[file.split('.')[0]]));
      if (missing) {
        const outputs = (projectMeta.outputs ?? []).map(output => ({ ...output, animationNames: { ...(output.animationNames ?? {}), ...names } }));
        await db.artifact.update({ where: { id }, data: { metadata: JSON.stringify({ ...projectMeta, outputs }) } });
      }
    }
    return ok(results);
  } catch (error) { return fail(error); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params;
    const jobId = new URL(req.url).searchParams.get('job');
    if (!jobId) throw new HttpError('작업을 선택해주세요.', 400);
    const row = await db.artifact.findFirst({ where: { id: jobId, ownerId: user.id, type: '3d_motion' } });
    if (!row) throw new HttpError('작업을 찾을 수 없습니다.', 404);
    const meta: MotionJob = JSON.parse(row.metadata);
    if (meta.projectId !== id) throw new HttpError('작업을 찾을 수 없습니다.', 404);
    if (row.status !== 'processing' || !meta.jobId) throw new HttpError('접수 확인 전이거나 이미 종료된 작업입니다.', 409);
    await cancelRunpodJob('rigging', meta.jobId);
    // Keep polling for the provider's final state; completion can race cancellation.
    return ok({ cancellationRequested: true });
  } catch (error) { return fail(error); }
}
