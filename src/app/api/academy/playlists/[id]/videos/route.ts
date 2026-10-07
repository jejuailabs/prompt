import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { academyInclude, courseLessons, copyLesson } from '@/lib/server/academy-library';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = z.object({ lessonId: z.string().min(1).max(100) }).strict().safeParse(await readJson<unknown>(req));
    if (!parsed.success) throw new HttpError('개별 영상을 먼저 등록하고 목록에서 선택해주세요.');
    const result = await db.$transaction(async tx => {
      const course = await tx.academyPlaylist.findUnique({ where: { id }, include: academyInclude });
      if (!course || !course.published || course.videos.length < 2) throw new HttpError('묶인 강의를 찾을 수 없어요.', 404);
      if (course.videos.length >= 100) throw new HttpError('한 강의에는 최대 100개 영상을 담을 수 있어요.');
      const [video] = await courseLessons(tx, [parsed.data.lessonId]);
      if (course.videos.some(v => v.videoId === video.videoId)) throw new HttpError('이미 강의에 포함된 영상이에요.', 409);
      return tx.academyVideo.create({ data: { playlistId: id, ...copyLesson(video, Math.max(...course.videos.map(v => v.sortOrder)) + 1) } });
    }, { isolationLevel: 'Serializable', timeout: 30_000 });
    return ok(result, 201);
  } catch (e) { return fail(e); }
}
