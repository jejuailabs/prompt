import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { analyzeAcademyVideo } from '@/lib/server/academy';

export const maxDuration = 300;

// POST — admin re-runs transcript (SocialKit) + AI study-note analysis for one lesson.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; videoId: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id, videoId } = await params;
    if (!await db.academyVideo.findFirst({ where: { id: videoId, playlistId: id, playlist: { published: true } } })) throw new HttpError('이 강의의 영상을 찾을 수 없어요.', 404);
    const analysis = await analyzeAcademyVideo(videoId, admin.id);
    if (!analysis) throw new HttpError('강의 영상을 찾을 수 없습니다', 404);
    return ok(analysis);
  } catch (e) { return fail(e); }
}
