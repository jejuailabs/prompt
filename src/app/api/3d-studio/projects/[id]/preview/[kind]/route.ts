import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { downloadBuffer } from '@/lib/server/storage';
import { parseMeta } from '../../../route';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  try {
    const user = await requireUser();
    const { id, kind } = await params;
    if (kind !== 'latest') throw new HttpError('미리보기 단계를 찾을 수 없습니다', 404);
    const project = await db.artifact.findFirst({
      where: { id, ownerId: user.id, type: '3d_asset', sourceModule: '3d-studio' },
      select: { metadata: true },
    });
    if (!project) throw new HttpError('3D 프로젝트를 찾을 수 없습니다', 404);
    const paths = parseMeta(project.metadata).previewPaths;
    if (!paths) throw new HttpError('미리보기가 없습니다', 404);
    let bytes: Buffer | undefined;
    for (const path of [paths.surface, paths.shape, paths.structure]) {
      try { bytes = await downloadBuffer(path); break; }
      catch { /* A later stage may not have been uploaded yet. */ }
    }
    if (!bytes) throw new HttpError('중간 형상을 계산 중입니다', 404);
    if (bytes.length > 300_000) throw new HttpError('미리보기 데이터가 너무 큽니다', 422);
    return new Response(new Uint8Array(bytes), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' },
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: error instanceof Error ? error.message : '미리보기를 불러오지 못했습니다' }, { status, headers: { 'cache-control': 'no-store' } });
  }
}
