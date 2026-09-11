import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { parseYoutubeVideoId, toYoutubeAnalysisDTO } from '@/lib/server/youtube-analysis';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { url } = await readJson<{ url?: string }>(req);
    const videoId = url ? parseYoutubeVideoId(url) : null;
    if (!url || !videoId) throw new HttpError('유효한 YouTube URL을 입력해주세요');
    let analysis = await db.youtubeAnalysis.findUnique({ where: { videoId } });
    if (!analysis) analysis = await db.youtubeAnalysis.create({ data: { videoId, sourceUrl: url, thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` } });
    const job = analysis.status === 'done'
      ? null
      : await db.youtubeAnalysisJob.create({ data: { userId: user.id, analysisId: analysis.id } });
    return ok({ analysis: toYoutubeAnalysisDTO(analysis), jobId: job?.id ?? null });
  } catch (e) { return fail(e); }
}
