import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { toYoutubeAnalysisDTO } from '@/lib/server/youtube-analysis';
import { createCourseSchema } from '@/modules/academy/curriculum';

type PlaylistRow = Prisma.AcademyPlaylistGetPayload<{ include: { videos: { include: { analysis: true } } } }>;
function serializePlaylist(p: PlaylistRow | null) {
  if (!p) return null;
  return {
    id: p.id, title: p.title, description: p.description, thumbnailUrl: p.thumbnailUrl, sortOrder: p.sortOrder,
    videos: p.videos.map((v) => ({ id: v.id, videoId: v.videoId, title: v.title, description: v.description,
      thumbnailUrl: v.thumbnailUrl, sortOrder: v.sortOrder, analysis: v.analysis ? toYoutubeAnalysisDTO(v.analysis) : null })),
  };
}

export async function GET() {
  try {
    const rows = await db.academyPlaylist.findMany({ where: { published: true }, orderBy: { sortOrder: 'asc' }, include: { videos: { orderBy: { sortOrder: 'asc' }, include: { analysis: true } } } });
    return ok(rows.map(serializePlaylist));
  } catch (e) { return fail(e); }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = createCourseSchema.safeParse(await readJson<unknown>(req));
    if (!parsed.success) throw new HttpError(parsed.error.issues[0]?.message ?? '과정 내용을 확인해주세요.');
    const { videos, ...course } = parsed.data;
    // One nested transaction: no partially saved course if an entry fails.
    const p = await db.academyPlaylist.create({ data: {
      ...course, published: true,
      thumbnailUrl: videos[0] ? `https://i.ytimg.com/vi/${videos[0].videoId}/hqdefault.jpg` : null,
      videos: { create: videos.map((video, sortOrder) => ({
        videoId: video.videoId, title: video.title, description: video.description.slice(0, 500), sortOrder,
        thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        analysis: { connectOrCreate: { where: { videoId: video.videoId }, create: {
          videoId: video.videoId, sourceUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          title: video.title, channelTitle: video.channelTitle, description: video.description,
          durationSeconds: video.durationSeconds, thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        } } },
      })) },
    }, include: { videos: { orderBy: { sortOrder: 'asc' }, include: { analysis: true } } } });
    return ok(serializePlaylist(p), 201);
  } catch (e) { return fail(e); }
}
