import type { Asset3dProjectDTO, Asset3dSubtrack, Asset3dWorkflowMode, Asset3dWorkflowStageDTO } from '@/lib/types';

export interface ProjectMeta {
  kind?: string;
  subtrack?: Asset3dSubtrack;
  inputImageUrls?: string[];
  styleOptions?: Record<string, unknown>;
  previewPaths?: { structure: string; shape: string; surface: string };
  blender?: { engine?: 'trellis' | 'character_blender'; jobId?: string; accountingJobId?: string; outputPath?: string; creditCharged?: number; status?: string; error?: string; queuedAt?: string; completedAt?: string; delayTimeMs?: number; executionTimeMs?: number };
  /** Always self-hosted on RunPod; never a paid third-party rigging API. */
  rigging?: { provider: 'skintokens'; jobId: string; status: string; progress?: number; queuedAt: string; completedAt?: string; error?: string; outputPaths?: Record<string, string>; outputUrls?: Record<string, string> };
  /** Kept while re-rigging so a failed attempt leaves the working Unity files intact. */
  riggingPreviousStages?: Asset3dWorkflowStageDTO[];
  riggingSettings?: { heightMeters?: number; orientationConfirmed?: boolean; jointNotes?: string };
  outputs?: Asset3dProjectDTO['outputs'];
  workflowMode?: Asset3dWorkflowMode;
  workflowStages?: Asset3dWorkflowStageDTO[];
}

export function initialWorkflowStages(): Asset3dWorkflowStageDTO[] {
  return [
    { id: 'trellis', title: '1. TRELLIS 3D 형상 생성', description: '입력 이미지를 PBR GLB 메시로 변환합니다.', status: 'running' },
    { id: 'rigging_animation', title: '2. 자동 리깅', description: '뼈대와 스킨 웨이트를 생성합니다. 동작 클립은 별도로 연결해야 합니다.', status: 'pending' },
    { id: 'blender', title: '3. Blender 변환·검증', description: '리깅 후 컬러 FBX를 출력하고 재임포트로 뼈대·웨이트를 검증합니다.', status: 'pending' },
    { id: 'animation', title: '4. 애니메이션 적용·검수', description: '동작을 리깅된 캐릭터에 적용하고 재생 결과를 확인합니다.', status: 'pending' },
    { id: 'unity_bundle', title: '5. Unity 가져오기 번들', description: '검증된 애니메이션 FBX/GLB와 텍스처를 함께 제공합니다.', status: 'pending' },
  ];
}

function workflowStagesFor(meta: ProjectMeta, row: { status: string }): Asset3dWorkflowStageDTO[] {
  if (meta.workflowStages?.length) return meta.workflowStages.map((stage) => ({ ...stage, error: userFacingBlenderError(stage.error) ?? undefined }));
  const stages = initialWorkflowStages();
  const output = meta.outputs?.[0];
  if (output?.glbUrl) {
    stages[0] = { ...stages[0], status: 'completed', previewGlbUrl: output.glbUrl };
    stages[1] = { ...stages[1], status: output.riggedFbxUrl ? 'completed' : 'awaiting_approval', previewGlbUrl: output.riggedGlbUrl ?? output.glbUrl, fbxUrl: output.riggedFbxUrl ?? undefined };
    stages[2] = { ...stages[2], status: output.riggedFbxUrl ? 'completed' : 'pending', previewGlbUrl: output.riggedGlbUrl ?? output.glbUrl, fbxUrl: output.riggedFbxUrl ?? undefined, textureUrls: output.textureUrls };
    stages[3] = { ...stages[3], status: output.animationUrls && Object.keys(output.animationUrls).length ? 'completed' : output.riggedFbxUrl ? 'awaiting_approval' : 'pending' };
    stages[4] = { ...stages[4], status: stages[3].status === 'completed' ? 'completed' : 'pending', previewGlbUrl: output.riggedGlbUrl ?? output.glbUrl, fbxUrl: output.riggedFbxUrl ?? undefined, textureUrls: output.textureUrls };
  } else if (row.status === 'failed') {
    stages[0] = { ...stages[0], status: 'failed', error: userFacingBlenderError(meta.blender?.error) ?? undefined };
  }
  return stages;
}

export function parseMeta(raw: string): ProjectMeta {
  try {
    const meta = JSON.parse(raw) as ProjectMeta;
    if (meta.workflowStages?.length && !meta.workflowStages.some((stage) => stage.id === 'animation')) {
      const stages = initialWorkflowStages();
      const animation = stages.find((stage) => stage.id === 'animation')!;
      const rigged = Boolean(meta.outputs?.[0]?.riggedGlbUrl);
      animation.status = rigged ? 'awaiting_approval' : 'pending';
      const unity = meta.workflowStages.find((stage) => stage.id === 'unity_bundle');
      if (unity && !Object.keys(meta.outputs?.[0]?.animationUrls ?? {}).length) unity.status = 'pending';
      meta.workflowStages = [
        ...meta.workflowStages.filter((stage) => stage.id !== 'unity_bundle'),
        animation,
        ...(unity ? [{ ...unity, title: stages[4].title, description: stages[4].description }] : [stages[4]]),
      ];
    }
    return meta;
  } catch { return {}; }
}

function userFacingBlenderError(error?: string): string | null {
  if (!error) return null;
  if (error.includes('address is required')) {
    return '연결된 워커가 이미지 에셋 생성용이 아닌 건축 분석용 워커여서 실패했습니다. 전용 생성 워커 연결 전에는 재시도할 수 없습니다.';
  }
  if (error.includes('analysisId is required') || error.includes('parcel and scenario are required')) return '건축 분석용 워커에 이미지 에셋 작업이 전달되어 실패했습니다. 전용 생성 워커 연결이 필요합니다.';
  try {
    const parsed = JSON.parse(error) as { error_message?: unknown };
    if (typeof parsed.error_message === 'string' && parsed.error_message.trim()) return parsed.error_message.trim().slice(0, 300);
  } catch {
    // Preserve a concise non-JSON provider error below.
  }
  return error.replace(/\s+/g, ' ').trim().slice(0, 300) || 'Blender 작업을 완료하지 못했습니다.';
}

export function toProject(row: { id: string; ownerId: string; title: string; status: string; metadata: string; createdAt: Date }) : Asset3dProjectDTO {
  const meta = parseMeta(row.metadata);
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    subtrack: meta.subtrack ?? 'character',
    status: (row.status === 'settling' ? 'processing' : ['draft', 'generating', 'processing', 'done', 'failed'].includes(row.status) ? row.status : 'draft') as Asset3dProjectDTO['status'],
    inputImageUrls: meta.inputImageUrls ?? [],
    styleOptions: meta.styleOptions,
    outputs: meta.outputs ?? [],
    creditCharged: 0,
    error: userFacingBlenderError(meta.blender?.error),
    generationTiming: { queuedAt: meta.blender?.queuedAt, completedAt: meta.blender?.completedAt, delayTimeMs: meta.blender?.delayTimeMs, executionTimeMs: meta.blender?.executionTimeMs },
    generationPreview: meta.previewPaths ? { url: `/api/3d-studio/projects/${row.id}/preview/latest` } : undefined,
    workflowMode: meta.workflowMode ?? 'automatic',
    workflowStages: workflowStagesFor(meta, row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.createdAt.toISOString(),
  };
}
