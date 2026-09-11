import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { parseYoutubeVideoId } from '@/lib/server/youtube-analysis';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: playlistId } = await params;
    const body = await readJson<{ url?: string; title?: string; description?: string; sortOrder?: number }>(req);
    const videoId = body.url ? parseYoutubeVideoId(body.url) : null;
    if (!videoId || !body.url) throw new HttpError('유효한 YouTube URL을 입력해주세요');
    const analysis = await db.youtubeAnalysis.upsert({ where: { videoId }, update: {}, create: { videoId, sourceUrl: body.url, thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` } });
    const video = await db.academyVideo.create({ data: { playlistId, videoId, analysisId: analysis.id, title: body.title?.trim() || `YouTube 영상 ${videoId}`, description: body.description?.slice(0, 500) ?? '', thumbnailUrl: analysis.thumbnailUrl, sortOrder: body.sortOrder ?? 0 } });
    return ok(video, 201);
  } catch (e) { return fail(e); }
}
