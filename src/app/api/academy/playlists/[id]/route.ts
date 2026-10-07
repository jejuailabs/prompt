import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { updateCourseSchema } from '@/modules/academy/curriculum';
import { academyInclude, serializeAcademyCollection, courseLessons, copyLesson, preserveStandaloneLessons } from '@/lib/server/academy-library';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = updateCourseSchema.safeParse(await readJson<unknown>(req));
    if (!parsed.success) throw new HttpError(parsed.error.issues[0]?.message ?? '강의 내용을 확인해주세요.');
    const { lessonIds, ...details } = parsed.data;
    const result = await db.$transaction(async tx => {
      const current = await tx.academyPlaylist.findUnique({ where: { id }, include: academyInclude });
      if (!current || !current.published || current.videos.length < 2) throw new HttpError('묶인 강의를 찾을 수 없어요.', 404);
      if (lessonIds) {
        const ordered = await courseLessons(tx, lessonIds);
        const keep = new Set(ordered.map(v => v.videoId));
        const removed = current.videos.filter(v => !keep.has(v.videoId));
        await preserveStandaloneLessons(tx, removed);
        await tx.academyVideo.deleteMany({ where: { playlistId: id, id: { in: removed.map(v => v.id) } } });
        // Keep existing membership IDs so reordering does not erase progress or notes.
        for (const [sortOrder, video] of ordered.entries()) {
          const existing = current.videos.find(v => v.videoId === video.videoId);
          if (existing) await tx.academyVideo.update({ where: { id: existing.id }, data: { sortOrder } });
          else await tx.academyVideo.create({ data: { playlistId: id, ...copyLesson(video, sortOrder) } });
        }
        return tx.academyPlaylist.update({ where: { id }, data: { ...details, thumbnailUrl: ordered[0].thumbnailUrl }, include: academyInclude });
      }
      return tx.academyPlaylist.update({ where: { id }, data: details, include: academyInclude });
    }, { isolationLevel: 'Serializable', timeout: 30_000 });
    return ok(serializeAcademyCollection(result));
  } catch (e) { return fail(e); }
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.$transaction(async tx => {
      const course = await tx.academyPlaylist.findUnique({ where: { id }, include: academyInclude });
      if (!course || !course.published || course.videos.length < 2) throw new HttpError('묶인 강의를 찾을 수 없어요.', 404);
      await preserveStandaloneLessons(tx, course.videos);
      await tx.academyPlaylist.delete({ where: { id } });
    }, { isolationLevel: 'Serializable', timeout: 30_000 });
    return ok(null);
  } catch (e) { return fail(e); }
}
