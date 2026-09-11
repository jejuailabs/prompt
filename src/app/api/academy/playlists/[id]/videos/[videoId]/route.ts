import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { parseYoutubeVideoId } from '@/lib/server/youtube-analysis';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; videoId: string }> }) {
  try {
    await requireAdmin(); const { videoId: id } = await params;
    const body = await readJson<{ url?: string; title?: string; description?: string; sortOrder?: number }>(req);
    const nextVideoId = body.url ? parseYoutubeVideoId(body.url) : undefined;
    if (body.url && !nextVideoId) throw new HttpError('유효한 YouTube URL을 입력해주세요');
    const analysis = nextVideoId ? await db.youtubeAnalysis.upsert({ where: { videoId: nextVideoId }, update: {}, create: { videoId: nextVideoId, sourceUrl: body.url! } }) : null;
    const video = await db.academyVideo.update({ where: { id }, data: {
      ...(nextVideoId ? { videoId: nextVideoId, analysisId: analysis!.id, thumbnailUrl: analysis!.thumbnailUrl } : {}),
      ...(body.title !== undefined ? { title: body.title.trim().slice(0, 160) } : {}),
      ...(body.description !== undefined ? { description: body.description.slice(0, 500) } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    } });
    return ok(video);
  } catch (e) { return fail(e); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; videoId: string }> }) {
  try { await requireAdmin(); const { videoId } = await params; await db.academyVideo.delete({ where: { id: videoId } }); return ok(null); } catch (e) { return fail(e); }
}
