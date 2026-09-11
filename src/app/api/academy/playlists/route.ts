import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { toYoutubeAnalysisDTO } from '@/lib/server/youtube-analysis';

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
    const body = await readJson<{ title?: string; description?: string; sortOrder?: number }>(req);
    if (!body.title?.trim()) throw new HttpError('강의 과정 이름을 입력해주세요');
    const p = await db.academyPlaylist.create({ data: { title: body.title.trim().slice(0, 120), description: (body.description ?? '').slice(0, 1000), sortOrder: body.sortOrder ?? 0, published: true }, include: { videos: { include: { analysis: true } } } });
    return ok(serializePlaylist(p), 201);
  } catch (e) { return fail(e); }
}
