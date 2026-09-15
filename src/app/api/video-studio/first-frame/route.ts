import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { buildFluxWorkflow } from '@/lib/server/flux-workflow';
import { getRunpodJobStatus, queueRunpodWorkflow } from '@/lib/server/runpod';
import { beginMeteredOperation, failMeteredOperation, finishMeteredOperation } from '@/lib/server/operation-ledger';
import { uploadBuffer } from '@/lib/server/storage';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<{ prompt?: string; aspect?: string }>(req);
    const prompt = body.prompt?.trim() ?? '';
    if (prompt.length < 3 || prompt.length > 4000) throw new HttpError('이미지 설명을 3~4000자로 입력해주세요', 400);
    const [width, height] = body.aspect === '9:16' ? [576, 1024] : body.aspect === '16:9' ? [1024, 576] : [1024, 1024];
    const ledger = await beginMeteredOperation({ userId: user.id, engine: 'flux', prompt, aspect: body.aspect });
    try {
      const job = await queueRunpodWorkflow('flux', buildFluxWorkflow(prompt, width, height));
      const artifact = await db.artifact.create({ data: {
        ownerId: user.id, type: 'image', sourceModule: 'video-studio-first-frame', title: prompt.slice(0, 80),
        status: 'processing', visibility: 'private',
        metadata: JSON.stringify({ jobId: job.id, accountingJobId: ledger.operationId, status: job.status }),
      } });
      return ok({ id: artifact.id, status: job.status });
    } catch (error) {
      await failMeteredOperation(ledger.operationId, error instanceof Error ? error.message : '이미지 생성 요청 실패');
      throw error;
    }
  } catch (error) { return fail(error); }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) throw new HttpError('작업 ID가 필요합니다', 400);
    const artifact = await db.artifact.findFirst({ where: { id, ownerId: user.id, sourceModule: 'video-studio-first-frame' } });
    if (!artifact) throw new HttpError('이미지 작업을 찾을 수 없습니다', 404);
    const meta = JSON.parse(artifact.metadata) as { jobId: string; accountingJobId: string; status: string; error?: string; executionTime?: number; delayTime?: number };
    if (artifact.status === 'completed' || artifact.status === 'failed') return ok({ id, status: meta.status, url: artifact.fileUrl, error: meta.error, executionTime: meta.executionTime, delayTime: meta.delayTime });
    const job = await getRunpodJobStatus('flux', meta.jobId);
    let url: string | null = null;
    if (job.status === 'COMPLETED') {
      const output = job.output as { images?: { data?: string; type?: string }[] } | undefined;
      const image = output?.images?.find((item) => item.type === 'base64' && item.data);
      const bytes = image?.data ? Buffer.from(image.data, 'base64') : null;
      if (!bytes || bytes.length > 5 * 1024 * 1024 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
        job.status = 'FAILED'; job.error = '사용 가능한 PNG 이미지가 반환되지 않았습니다';
      } else url = await uploadBuffer(`studio-first-frames/${id}.png`, bytes, 'image/png');
    }
    const terminal = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(job.status);
    await finishMeteredOperation({ operationId: meta.accountingJobId, engine: 'flux', status: job.status, error: job.error, executionTimeMs: job.executionTime });
    if (terminal) await db.artifact.update({ where: { id }, data: { fileUrl: url, status: url ? 'completed' : 'failed', metadata: JSON.stringify({ ...meta, status: job.status, error: job.error, executionTime: job.executionTime, delayTime: job.delayTime }) } });
    return ok({ id, status: job.status, url, error: job.error, executionTime: job.executionTime, delayTime: job.delayTime });
  } catch (error) { return fail(error); }
}
