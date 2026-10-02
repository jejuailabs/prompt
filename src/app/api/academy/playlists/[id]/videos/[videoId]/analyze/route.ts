import { NextRequest } from 'next/server';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { analyzeAcademyVideo } from '@/lib/server/academy';

export const maxDuration = 300;

// POST — admin re-runs transcript (SocialKit) + AI study-note analysis for one lesson.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; videoId: string }> }) {
  try {
    const admin = await requireAdmin();
    const { videoId } = await params;
    const analysis = await analyzeAcademyVideo(videoId, admin.id);
    if (!analysis) throw new HttpError('강의 영상을 찾을 수 없습니다', 404);
    return ok(analysis);
  } catch (e) { return fail(e); }
}
