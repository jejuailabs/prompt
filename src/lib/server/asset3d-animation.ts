import 'server-only';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { suggestBoneMapping } from '@/lib/asset3d-bone-mapping';
import { loadMotionLibrary } from '@/lib/server/motion-library';
import { queueRunpodJob } from '@/lib/server/runpod';
import { createSignedWorkerUploads } from '@/lib/server/storage';

const required = ['Hips', 'Spine', 'Head', 'LeftUpperArm', 'LeftLowerArm', 'RightUpperArm', 'RightLowerArm', 'LeftUpperLeg', 'LeftLowerLeg', 'RightUpperLeg', 'RightLowerLeg'];

/** Queue one neutral motion after automatic rigging. Users can choose others in the UI. */
export async function queueAutomaticCharacterMotion(input: { ownerId: string; projectId: string; riggingJobId: string; riggedGlb: Buffer; riggedGlbUrl: string }) {
  const model = input.riggedGlb;
  const scene = JSON.parse(model.toString('utf8', 20, 20 + model.readUInt32LE(12)));
  const mapping = suggestBoneMapping(scene);
  if (!required.every(role => mapping[role])) throw new Error('자동 관절 매핑이 불완전합니다. 애니메이션 화면에서 뼈대를 확인하고 직접 지정해주세요.');
  const { storage, motions } = await loadMotionLibrary();
  const motion = motions.find(item => item.category === 'Idle' && item.name === 'Breathing Idle') ?? motions.find(item => item.category === 'Idle');
  if (!motion) throw new Error('자동 적용할 대기 동작이 모션 라이브러리에 없습니다.');
  const { data: fbx, error } = await storage.download(motion.file);
  if (error || !fbx || fbx.size > 28_000_000) throw new Error('자동 적용할 모션 FBX를 읽지 못했습니다.');
  const { data: motionAccess, error: accessError } = await storage.createSignedUrl(motion.file, 3600);
  if (accessError || !motionAccess?.signedUrl) throw new Error('자동 적용할 모션 접근 주소를 만들지 못했습니다.');
  const hash = createHash('sha256').update(`${input.projectId}:${input.riggingJobId}:auto-motion`).digest('hex');
  const requestId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  const existing = await db.artifact.findUnique({ where: { id: requestId } });
  if (existing) return requestId;
  const root = `3d/${input.ownerId}/${input.projectId}/motions/${requestId}`;
  const uploads = await createSignedWorkerUploads({
    'preview.glb': { path: `${root}/preview.glb`, contentType: 'model/gltf-binary' },
    'character.fbx': { path: `${root}/character.fbx`, contentType: 'application/octet-stream' },
  });
  const metadata: Record<string, unknown> = { projectId: input.projectId, motionId: motion.id, queuedAt: new Date().toISOString(), automatic: true,
    outputPaths: Object.fromEntries(Object.entries(uploads).map(([name, upload]) => [name, upload.path])) };
  await db.artifact.create({ data: { id: requestId, ownerId: input.ownerId, type: '3d_motion', sourceModule: '3d-studio', title: motion.name, status: 'submitting', visibility: 'private', metadata: JSON.stringify(metadata) } });
  try {
    const job = await queueRunpodJob('rigging', {
      operation: 'retarget', model_url: input.riggedGlbUrl, motion_url: motionAccess.signedUrl,
      bone_mapping: mapping, clip_name: motion.name, in_place: true,
      output_uploads: Object.fromEntries(Object.entries(uploads).map(([name, upload]) => [name, { signed_url: upload.signedUrl, content_type: upload.contentType }])),
    });
    metadata.jobId = job.id;
    await db.artifact.update({ where: { id: requestId }, data: { status: 'processing', metadata: JSON.stringify(metadata) } });
    return requestId;
  } catch (failure) {
    metadata.error = failure instanceof Error ? failure.message : '자동 애니메이션 접수 실패';
    await db.artifact.update({ where: { id: requestId }, data: { status: 'failed', metadata: JSON.stringify(metadata) } });
    throw failure;
  }
}
