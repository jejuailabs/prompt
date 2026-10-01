import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { cancelVideoUpscale } from '@/lib/server/video-upscale-runpod';
import { finishVideoUpscaleOperation } from '@/lib/server/video-upscale-ledger';

function metadata(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);
    const meta = metadata(project.metadata);
    const upscale = meta.upscale as { runpodJobId?: string; accountingJobId?: string; status?: string } | undefined;
    if (!upscale?.runpodJobId) throw new HttpError('취소할 업스케일 작업이 없습니다', 404);
    await cancelVideoUpscale(upscale.runpodJobId);
    const nextUpscale = { ...upscale, status: 'CANCELLED', error: '사용자가 업스케일 작업을 중지했습니다.', completedAt: new Date().toISOString() };
    await db.artifact.update({ where: { id: project.id }, data: { metadata: JSON.stringify({ ...meta, upscale: nextUpscale }) } });
    await finishVideoUpscaleOperation({ operationId: upscale.accountingJobId, status: 'CANCELLED', error: nextUpscale.error });
    return ok({ status: 'CANCELLED' });
  } catch (error) {
    return fail(error);
  }
}
