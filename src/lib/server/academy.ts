// Academy curriculum helpers: analyze a lesson video now and sync its card from the result.
import { db } from '@/lib/db';
import { processYoutubeAnalysis } from '@/lib/server/youtube-analysis';

/** Runs (or re-runs) the transcript + study-note analysis for a lesson, then refreshes the lesson card. */
export async function analyzeAcademyVideo(videoRowId: string, userId: string) {
  const video = await db.academyVideo.findUnique({ where: { id: videoRowId } });
  if (!video) return null;
  if (!video.analysisId) {
    const cached = await db.youtubeAnalysis.upsert({ where: { videoId: video.videoId }, update: {}, create: { videoId: video.videoId, sourceUrl: 'https://www.youtube.com/watch?v=' + video.videoId, title: video.title, thumbnailUrl: video.thumbnailUrl } });
    video.analysisId = cached.id;
    await db.academyVideo.updateMany({ where: { videoId: video.videoId, analysisId: null }, data: { analysisId: cached.id } });
  }
  const job = await db.youtubeAnalysisJob.create({ data: { userId, analysisId: video.analysisId } });
  await processYoutubeAnalysis(job.id);
  const analysis = await db.youtubeAnalysis.findUnique({ where: { id: video.analysisId }, select: { title: true, thumbnailUrl: true, description: true, status: true, error: true, transcriptSource: true } });
  if (analysis?.title) {
    await db.academyVideo.updateMany({ where: { videoId: video.videoId }, data: {
      title: analysis.title.slice(0, 160),
      ...(analysis.thumbnailUrl ? { thumbnailUrl: analysis.thumbnailUrl } : {}),
      ...(analysis.description ? { description: analysis.description.slice(0, 500) } : {}),
    } });
  }
  return analysis;
}
