import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { processYoutubeAnalysis, toYoutubeAnalysisDTO } from '@/lib/server/youtube-analysis';

export const maxDuration = 60;
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params;
    const job = await db.youtubeAnalysisJob.findFirst({ where: { id, userId: user.id }, include: { analysis: true } });
    if (!job) throw new HttpError('분석 작업을 찾을 수 없습니다', 404);
    return ok({ id: job.id, status: job.status, error: job.error, analysis: toYoutubeAnalysisDTO(job.analysis) });
  } catch (e) { return fail(e); }
}
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params;
    const job = await db.youtubeAnalysisJob.findFirst({ where: { id, userId: user.id } });
    if (!job) throw new HttpError('분석 작업을 찾을 수 없습니다', 404);
    await processYoutubeAnalysis(job.id);
    return ok({ processed: true });
  } catch (e) { return fail(e); }
}
