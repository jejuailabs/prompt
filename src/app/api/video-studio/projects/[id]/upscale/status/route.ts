import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { finishVideoUpscaleOperation } from '@/lib/server/video-upscale-ledger';
import { getVideoUpscaleStatus } from '@/lib/server/video-upscale-runpod';
import { videoUpscaleObjectExists, videoUpscalePublicUrl } from '@/lib/server/video-upscale-storage';

function metadata(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

type Upscale = {
  runpodJobId?: string; accountingJobId?: string; status?: string; outputPath?: string; outputUrl?: string;
  executionTime?: number; delayTime?: number; error?: string; tier?: string;
};
const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);
    const meta = metadata(project.metadata);
    const upscale = meta.upscale as Upscale | undefined;
    if (!upscale?.runpodJobId) throw new HttpError('진행 중인 업스케일 작업이 없습니다', 404);
    if (TERMINAL.has(upscale.status ?? '')) {
      await finishVideoUpscaleOperation({ operationId: upscale.accountingJobId, status: upscale.status!, executionTimeMs: upscale.executionTime, error: upscale.error });
      return ok({ id: upscale.runpodJobId, status: upscale.status, videoUrl: upscale.outputUrl ?? null, executionTime: upscale.executionTime, delayTime: upscale.delayTime, error: upscale.error, tier: upscale.tier });
    }
    const job = await getVideoUpscaleStatus(upscale.runpodJobId);
    let status = job.status;
    let error = job.error;
    let videoUrl = upscale.outputUrl ?? (upscale.outputPath ? videoUpscalePublicUrl(upscale.outputPath) : null);
    if (status === 'COMPLETED' && (!upscale.outputPath || !await videoUpscaleObjectExists(upscale.outputPath))) {
      status = 'FAILED';
      error = '업스케일 워커가 완료됐지만 결과 파일이 저장되지 않았습니다.';
      videoUrl = null;
    }
    if (TERMINAL.has(status)) {
      const shots = Array.isArray(meta.shots) ? meta.shots as Array<Record<string, unknown>> : [];
      const nextUpscale = { ...upscale, status, error, videoUrl, executionTime: job.executionTime, delayTime: job.delayTime, completedAt: new Date().toISOString() };
      const nextMeta = {
        ...meta,
        upscale: nextUpscale,
        shots: shots.map((shot) => ({ ...shot, upscales: Array.isArray(shot.upscales) ? shot.upscales.map((item) => (item as Upscale).runpodJobId === upscale.runpodJobId ? nextUpscale : item) : shot.upscales })),
      };
      const saved = await db.artifact.updateMany({ where: { id: project.id, metadata: project.metadata }, data: { metadata: JSON.stringify(nextMeta) } });
      if (!saved.count) throw new HttpError('작업 상태가 변경됐습니다. 다시 확인해주세요.', 409);
    }
    await finishVideoUpscaleOperation({ operationId: upscale.accountingJobId, status, executionTimeMs: job.executionTime, error });
    return ok({ id: job.id, status, videoUrl, executionTime: job.executionTime, delayTime: job.delayTime, error, tier: upscale.tier });
  } catch (error) {
    return fail(error);
  }
}
