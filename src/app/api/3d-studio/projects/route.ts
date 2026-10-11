import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserFast, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { queueRunpodJob } from '@/lib/server/runpod';
import { beginMeteredOperation, failMeteredOperation } from '@/lib/server/operation-ledger';
import { createSignedWorkerUploads } from '@/lib/server/storage';
import { trellisWebhookUrl } from '@/lib/server/trellis-webhook';
import type { Asset3dSubtrack, Asset3dWorkflowMode } from '@/lib/types';

import { initialWorkflowStages, parseMeta, toProject, type ProjectMeta } from '@/lib/server/asset3d-project';

interface CreateProjectBody {
  title?: string;
  subtrack?: Asset3dSubtrack;
  inputImageUrls?: string[];
  styleOptions?: Record<string, unknown>;
  workflowMode?: Asset3dWorkflowMode;
}

export async function GET() {
  try {
    const user = await getSessionUserFast();
    if (!user) throw new HttpError('로그인이 필요합니다', 401);
    const rows = await db.artifact.findMany({
      where: { ownerId: user.id, type: '3d_asset', sourceModule: '3d-studio' },
      orderBy: { createdAt: 'desc' },
    });
    return ok(rows.map(toProject));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    // Keep public generation gated until broader quality validation completes,
    // while allowing administrators to run the verified A100 pipeline and review outputs.
    if (process.env.TRELLIS_GENERATION_VERIFIED !== 'true' && user.role !== 'admin') {
      throw new HttpError('3D 생성 품질 검증 중입니다. 크레딧은 차감되지 않습니다.', 503);
    }
    const body = await readJson<CreateProjectBody>(req);
    const subtrack = body.subtrack;
    if (!subtrack || !['character', 'product', 'floorplan'].includes(subtrack)) throw new HttpError('에셋 유형을 선택해주세요', 400);
    if (subtrack === 'floorplan') throw new HttpError('치수가 필요한 도면 변환은 아직 지원하지 않습니다. 캐릭터 또는 제품 사진을 선택해주세요.', 400);
    const imageUrls = (body.inputImageUrls ?? []).filter((url) => typeof url === 'string').slice(0, 5);
    if (!imageUrls.length) throw new HttpError('3D 생성에 사용할 참조 이미지를 선택해주세요', 400);
    if (imageUrls.length !== 1) throw new HttpError('현재 3D 생성은 대표 이미지 한 장을 지원합니다.', 400);
    const reference = new URL(imageUrls[0]);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || reference.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin || !reference.pathname.startsWith('/storage/v1/object/public/uploads/')) throw new HttpError('업로드한 참조 이미지를 선택해주세요.', 400);
    const title = (body.title?.trim() || `3D ${subtrack}`).slice(0, 120);
    const styleOptions = body.styleOptions ?? {};
    const quality = typeof styleOptions.quality === 'string' ? styleOptions.quality : 'standard';
    const workflowMode = body.workflowMode === 'guided' ? 'guided' : 'automatic';
    const baseMeta: ProjectMeta = { kind: '3d-project', subtrack, inputImageUrls: imageUrls, styleOptions, outputs: [], workflowMode, workflowStages: initialWorkflowStages() };
    const project = await db.artifact.create({
      data: { ownerId: user.id, type: '3d_asset', title, description: `${subtrack} TRELLIS.2 asset`, sourceModule: '3d-studio', fileUrl: imageUrls[0], metadata: JSON.stringify(baseMeta), visibility: 'private', status: 'generating' },
    });

    let ledger: Awaited<ReturnType<typeof beginMeteredOperation>>;
    try {
      ledger = await beginMeteredOperation({ userId: user.id, engine: 'trellis', prompt: `Image-to-3D: ${title}`, aspect: '3d', style: quality });
    } catch (error) {
      const meta = { ...baseMeta, blender: { status: 'FAILED', error: error instanceof Error ? error.message : '크레딧 차감에 실패했습니다' } };
      const failed = await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(meta), status: 'failed' } });
      return ok(toProject(failed));
    }
    try {
      const outputPath = `3d/${user.id}/${project.id}/trellis.glb`;
      const previewPaths = {
        structure: `3d/${user.id}/${project.id}/preview-structure.json`,
        shape: `3d/${user.id}/${project.id}/preview-shape.json`,
        surface: `3d/${user.id}/${project.id}/preview-surface.json`,
      };
      const uploads = await createSignedWorkerUploads({
        model: { path: outputPath, contentType: 'model/gltf-binary' },
        structure: { path: previewPaths.structure, contentType: 'application/octet-stream' },
        shape: { path: previewPaths.shape, contentType: 'application/octet-stream' },
        surface: { path: previewPaths.surface, contentType: 'application/octet-stream' },
      });
      const job = await queueRunpodJob('trellis', {
        input_image: imageUrls[0], resolution: 512, texture_size: 1024, output_format: 'glb',
        output_upload: { signed_url: uploads.model.signedUrl },
        preview_uploads: {
          structure: uploads.structure.signedUrl,
          shape: uploads.shape.signedUrl,
          surface: uploads.surface.signedUrl,
        },
      }, {
        webhook: trellisWebhookUrl(project.id, ledger.operationId),
        policy: { executionTimeout: 900_000, ttl: 5_400_000 },
      });
      const meta = { ...baseMeta, previewPaths, blender: { engine: 'trellis' as const, jobId: job.id, accountingJobId: ledger.operationId, outputPath, creditCharged: ledger.creditCharged, status: job.status, queuedAt: new Date().toISOString() } };
      const queued = await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(meta), status: 'generating' } });
      return ok(toProject(queued));
    } catch (error) {
      await failMeteredOperation(ledger.operationId, error instanceof Error ? error.message : 'Blender 렌더 요청 실패');
      const meta = { ...baseMeta, blender: { status: 'FAILED', error: error instanceof Error ? error.message : 'Blender 작업을 시작하지 못했습니다' } };
      const failed = await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(meta), status: 'failed' } });
      return ok(toProject(failed));
    }
  } catch (error) {
    return fail(error);
  }
}
