import { getRunpodEndpointId, queueRunpodJob } from '@/lib/server/runpod';
import type { Asset3dWorkflowStageDTO } from '@/lib/types';

/** Character Blender is deliberately separate from the older architectural worker. */
export async function queueCharacterPreparation(model: Buffer) {
  if (!process.env.RUNPOD_CHARACTER_BLENDER_ENDPOINT_ID?.trim()) {
    throw new Error('캐릭터 Blender 워커가 아직 연결되지 않았습니다. TRELLIS GLB는 안전하게 저장되어 있으며, 전용 워커 연결 후 이 단계만 다시 시작할 수 있습니다.');
  }
  return queueRunpodJob('character_blender', {
    model_base64: model.toString('base64'),
    settings: { profile: 'pc' },
  });
}

export function updateWorkflowStage(
  stages: Asset3dWorkflowStageDTO[] | undefined,
  id: Asset3dWorkflowStageDTO['id'],
  patch: Partial<Asset3dWorkflowStageDTO>,
): Asset3dWorkflowStageDTO[] {
  return (stages ?? []).map((stage) => stage.id === id ? { ...stage, ...patch } : stage);
}

/**
 * Queue the self-hosted SkinTokens / TokenRig worker. This has no SaaS key and
 * must not fall back to a paid provider. The worker returns base64 files:
 * rigged.glb, rigged.fbx, and optional animations/<name>.fbx.
 */
export async function queueSkinTokensRigging(input: {
  model: Buffer;
  heightMeters?: number;
  orientationConfirmed?: boolean;
  jointNotes?: string;
}) {
  if (!getRunpodEndpointId('rigging')) {
    throw new Error('자가호스팅 SkinTokens 리깅 워커가 아직 연결되지 않았습니다. 외부 유료 리깅 API로 대체 호출하지 않습니다.');
  }
  return queueRunpodJob('rigging', {
    model_base64: input.model.toString('base64'),
    settings: {
      height_meters: input.heightMeters ?? 1.7,
      forward_axis: '+Z',
      orientation_confirmed: input.orientationConfirmed === true,
      joint_notes: input.jointNotes?.slice(0, 1000),
      use_skeleton: false,
    },
  });
}
