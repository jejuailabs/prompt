import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { academyInclude, preserveStandaloneLessons } from '@/lib/server/academy-library';
const schema = z.object({ title: z.string().trim().min(1).max(160).optional(), description: z.string().max(500).optional(), sortOrder: z.number().int().min(0).max(99).optional() }).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; videoId: string }> }) {
  try {
    await requireAdmin();
    const { id, videoId } = await params;
    const parsed = schema.safeParse(await readJson<unknown>(req));
    if (!parsed.success) throw new HttpError('영상 제목·설명·순서를 확인해주세요. 영상 교체는 강의 편집에서 선택해주세요.');
    await db.$transaction(async tx => {
      const course = await tx.academyPlaylist.findUnique({ where: { id }, include: academyInclude });
      const video = course?.videos.find(v => v.id === videoId);
      if (!course || !course.published || course.videos.length < 2 || !video) throw new HttpError('이 강의의 영상을 찾을 수 없어요.', 404);
      const { sortOrder, ...details } = parsed.data;
      if (Object.keys(details).length) await tx.academyVideo.updateMany({ where: { videoId: video.videoId }, data: details });
      if (sortOrder !== undefined) {
        if (sortOrder >= course.videos.length) throw new HttpError('강의 범위 안의 순서를 입력해주세요.');
        const ordered = course.videos.filter(v => v.id !== videoId);
        ordered.splice(sortOrder, 0, video);
        for (const [index, entry] of ordered.entries()) await tx.academyVideo.update({ where: { id: entry.id }, data: { sortOrder: index } });
      }
    }, { isolationLevel: 'Serializable', timeout: 30_000 });
    return ok(null);
  } catch (e) { return fail(e); }
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; videoId: string }> }) {
  try {
    await requireAdmin();
    const { id, videoId } = await params;
    await db.$transaction(async tx => {
      const course = await tx.academyPlaylist.findUnique({ where: { id }, include: academyInclude });
      const video = course?.videos.find(v => v.id === videoId);
      if (!course || !course.published || course.videos.length < 2 || !video) throw new HttpError('이 강의의 영상을 찾을 수 없어요.', 404);
      if (course.videos.length <= 2) throw new HttpError('강의에는 두 개 이상의 영상이 필요해요. 모두 분리하려면 강의 묶음을 해제해주세요.');
      await preserveStandaloneLessons(tx, [video]);
      await tx.academyVideo.deleteMany({ where: { id: videoId, playlistId: id } });
      for (const [sortOrder, entry] of course.videos.filter(v => v.id !== videoId).entries()) await tx.academyVideo.update({ where: { id: entry.id }, data: { sortOrder } });
    }, { isolationLevel: 'Serializable', timeout: 30_000 });
    return ok(null);
  } catch (e) { return fail(e); }
}
