import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserFast, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { queueRunpodJob } from '@/lib/server/runpod';
import { beginMeteredOperation, failMeteredOperation } from '@/lib/server/operation-ledger';
import type { Asset3dProjectDTO, Asset3dSubtrack } from '@/lib/types';

interface ProjectMeta {
  kind?: string;
  subtrack?: Asset3dSubtrack;
  inputImageUrls?: string[];
  styleOptions?: Record<string, unknown>;
  blender?: { jobId?: string; accountingJobId?: string; creditCharged?: number; status?: string; error?: string; queuedAt?: string };
  outputs?: Asset3dProjectDTO['outputs'];
}

interface CreateProjectBody {
  title?: string;
  subtrack?: Asset3dSubtrack;
  inputImageUrls?: string[];
  styleOptions?: Record<string, unknown>;
}

function parseMeta(raw: string): ProjectMeta {
  try { return JSON.parse(raw) as ProjectMeta; } catch { return {}; }
}

function userFacingBlenderError(error?: string): string | null {
  if (!error) return null;
  if (error.includes('address is required')) {
    return 'Blender 워커가 시작 이미지 주소를 받지 못해 작업을 시작하지 못했습니다. 입력 규격을 수정했으니 새 에셋으로 다시 실행해주세요.';
  }
  try {
    const parsed = JSON.parse(error) as { error_message?: unknown };
    if (typeof parsed.error_message === 'string' && parsed.error_message.trim()) return parsed.error_message.trim().slice(0, 300);
  } catch {
    // Preserve a concise non-JSON provider error below.
  }
  return error.replace(/\s+/g, ' ').trim().slice(0, 300) || 'Blender 작업을 완료하지 못했습니다.';
}

function toProject(row: { id: string; ownerId: string; title: string; status: string; metadata: string; createdAt: Date }) : Asset3dProjectDTO {
  const meta = parseMeta(row.metadata);
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    subtrack: meta.subtrack ?? 'character',
    status: (['draft', 'generating', 'processing', 'done', 'failed'].includes(row.status) ? row.status : 'draft') as Asset3dProjectDTO['status'],
    inputImageUrls: meta.inputImageUrls ?? [],
    styleOptions: meta.styleOptions,
    outputs: meta.outputs ?? [],
    creditCharged: 0,
    error: userFacingBlenderError(meta.blender?.error),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.createdAt.toISOString(),
  };
}

function buildBlenderPrompt(title: string, subtrack: Asset3dSubtrack, quality: string, imageUrls: string[]) {
  const role = subtrack === 'character' ? 'game-ready character asset' : subtrack === 'product' ? 'product asset' : 'architectural floorplan scene';
  return `Create a ${role} in Blender named "${title}". Quality: ${quality}. Use the supplied reference images for silhouette, material, and composition. Return the rendered preview and, when available, the GLB asset. Reference images: ${imageUrls.join(', ')}`;
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
    const body = await readJson<CreateProjectBody>(req);
    const subtrack = body.subtrack;
    if (!subtrack || !['character', 'product', 'floorplan'].includes(subtrack)) throw new HttpError('에셋 유형을 선택해주세요', 400);
    const imageUrls = (body.inputImageUrls ?? []).filter((url) => typeof url === 'string').slice(0, 5);
    if (!imageUrls.length) throw new HttpError('Blender 작업에 사용할 참조 이미지를 한 장 이상 선택해주세요', 400);
    const title = (body.title?.trim() || `3D ${subtrack}`).slice(0, 120);
    const styleOptions = body.styleOptions ?? {};
    const quality = typeof styleOptions.quality === 'string' ? styleOptions.quality : 'standard';
    const baseMeta: ProjectMeta = { kind: '3d-project', subtrack, inputImageUrls: imageUrls, styleOptions, outputs: [] };
    const project = await db.artifact.create({
      data: { ownerId: user.id, type: '3d_asset', title, description: `${subtrack} Blender asset`, sourceModule: '3d-studio', fileUrl: imageUrls[0], metadata: JSON.stringify(baseMeta), visibility: 'private', status: 'generating' },
    });

    let ledger: Awaited<ReturnType<typeof beginMeteredOperation>>;
    try {
      ledger = await beginMeteredOperation({ userId: user.id, engine: 'blender', prompt: buildBlenderPrompt(title, subtrack, quality, imageUrls), aspect: '3d', style: quality });
    } catch (error) {
      const meta = { ...baseMeta, blender: { status: 'FAILED', error: error instanceof Error ? error.message : '크레딧 차감에 실패했습니다' } };
      const failed = await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify(meta), status: 'failed' } });
      return ok(toProject(failed));
    }
    try {
      // The deployed Blender handler accepts its primary reference through the
      // `address` field. Keep image_urls for handlers that consume a gallery,
      // but always satisfy the required single-image contract as well.
      const job = await queueRunpodJob('blender', { address: imageUrls[0], prompt: buildBlenderPrompt(title, subtrack, quality, imageUrls), image_urls: imageUrls, quality, subtrack });
      const meta = { ...baseMeta, blender: { jobId: job.id, accountingJobId: ledger.operationId, creditCharged: ledger.creditCharged, status: job.status, queuedAt: new Date().toISOString() } };
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

export { parseMeta, toProject };
