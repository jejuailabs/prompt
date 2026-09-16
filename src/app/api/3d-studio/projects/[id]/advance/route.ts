import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { initialWorkflowStages, parseMeta, toProject } from '../../route';
import { queueCharacterPreparation, queueSkinTokensRigging, updateWorkflowStage } from '@/lib/server/asset3d-character';

interface AdvanceBody {
  stage?: 'blender' | 'rigging_animation';
  heightMeters?: number;
  orientationConfirmed?: boolean;
  jointNotes?: string;
}

/** Starts the next paid stage only after the creator explicitly requests it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, type: '3d_asset', sourceModule: '3d-studio' } });
    if (!project) throw new HttpError('3D 프로젝트를 찾을 수 없습니다', 404);
    const body = await readJson<AdvanceBody>(req);
    const meta = parseMeta(project.metadata);
    const stages = meta.workflowStages?.length ? meta.workflowStages : initialWorkflowStages();
    const requestedStage = body.stage ?? 'blender';
    const blender = stages.find((stage) => stage.id === 'blender');
    const source = meta.outputs?.[0]?.glbUrl;
    if (!source) throw new HttpError('먼저 TRELLIS 3D 형상 생성이 완료되어야 합니다.', 409);
    stages[0] = { ...stages[0], status: 'completed', previewGlbUrl: source };
    if (requestedStage === 'blender') {
      if (blender?.status === 'running') throw new HttpError('Blender 준비가 이미 진행 중입니다.', 409);
      if (blender?.status === 'completed') throw new HttpError('Blender 준비가 이미 완료되었습니다.', 409);

      const response = await fetch(source, { cache: 'no-store' });
      if (!response.ok) throw new HttpError('저장된 GLB를 가져오지 못했습니다. 다시 시도해주세요.', 502);
      const model = Buffer.from(await response.arrayBuffer());
      const job = await queueCharacterPreparation(model);
      const startedAt = new Date().toISOString();
      const nextStages = updateWorkflowStage(stages, 'blender', { status: 'running', startedAt, error: undefined });
      const next = await db.artifact.update({ where: { id }, data: { status: 'processing', metadata: JSON.stringify({ ...meta, workflowStages: nextStages, blender: { ...meta.blender, engine: 'character_blender', jobId: job.id, status: job.status, queuedAt: startedAt } }) } });
      return ok(toProject(next));
    }

    const rigging = stages.find((stage) => stage.id === 'rigging_animation');
    if (rigging?.status === 'running') throw new HttpError('리깅·애니메이션이 이미 진행 중입니다.', 409);
    if (rigging?.status === 'completed') throw new HttpError('리깅이 이미 완료되었습니다.', 409);
    const heightMeters = typeof body.heightMeters === 'number' && body.heightMeters >= 0.5 && body.heightMeters <= 3 ? body.heightMeters : 1.7;
    const response = await fetch(source, { cache: 'no-store' });
    if (!response.ok) throw new HttpError('Blender 결과 GLB를 가져오지 못했습니다. 다시 시도해주세요.', 502);
    const model = Buffer.from(await response.arrayBuffer());
    const job = await queueSkinTokensRigging({ model, heightMeters, orientationConfirmed: body.orientationConfirmed === true, jointNotes: body.jointNotes });
    const queuedAt = new Date().toISOString();
    const nextStages = updateWorkflowStage(stages, 'rigging_animation', { status: 'running', startedAt: queuedAt, progress: 0, error: undefined });
    const next = await db.artifact.update({ where: { id }, data: { status: 'processing', metadata: JSON.stringify({ ...meta, workflowStages: nextStages, riggingSettings: { heightMeters, orientationConfirmed: body.orientationConfirmed === true, jointNotes: typeof body.jointNotes === 'string' ? body.jointNotes.slice(0, 1000) : undefined }, rigging: { provider: 'skintokens', jobId: job.id, status: job.status, progress: 0, queuedAt } }) } });
    return ok(toProject(next));
  } catch (error) {
    return fail(error);
  }
}
