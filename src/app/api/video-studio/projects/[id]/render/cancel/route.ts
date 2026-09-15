import { db } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { getRunpodEndpointId, type RunpodVideoEngine } from '@/lib/server/runpod';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio' } });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);
    const meta = JSON.parse(project.metadata);
    const render = meta.render;
    if (!render?.runpodJobId || !['h3', 'ltx', 'wan'].includes(render.engine)) throw new HttpError('중지할 작업이 없습니다', 400);
    if (['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(render.status)) return ok({ status: render.status });
    const endpoint = getRunpodEndpointId(render.engine as RunpodVideoEngine);
    if (!endpoint || !process.env.RUNPOD_API_KEY) throw new HttpError('렌더 서버 연결을 확인해주세요', 503);
    const response = await fetch(`https://api.runpod.ai/v2/${endpoint}/cancel/${encodeURIComponent(render.runpodJobId)}`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}` }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new HttpError('서버에서 중지를 확인하지 못했습니다. 상태 확인 후 다시 시도해주세요.', 502);
    const result = await response.json();
    // An acknowledgement alone is not proof of cancellation. Poll until terminal.
    if (result.status === 'CANCELLED') {
      await db.artifact.updateMany({ where: { id, metadata: project.metadata }, data: { status: 'failed', metadata: JSON.stringify({ ...meta, projectStatus: 'failed', render: { ...render, status: 'CANCELLED', error: '사용자가 생성을 중지했습니다.', completedAt: new Date().toISOString() } }) } });
    }
    return ok({ status: result.status === 'CANCELLED' ? 'CANCELLED' : 'CANCEL_REQUESTED' });
  } catch (error) { return fail(error); }
}
