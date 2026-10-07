import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { academyInclude, serializeAcademyCollection, getAcademyLibrary, courseLessons, copyLesson } from '@/lib/server/academy-library';
import { createCourseSchema } from '@/modules/academy/curriculum';

export async function GET() {
  try { return ok((await getAcademyLibrary()).courses); } catch (e) { return fail(e); }
}
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = createCourseSchema.safeParse(await readJson<unknown>(req));
    if (!parsed.success) throw new HttpError(parsed.error.issues[0]?.message ?? '강의 내용을 확인해주세요.');
    const { lessonIds, ...course } = parsed.data;
    const result = await db.$transaction(async tx => {
      const videos = await courseLessons(tx, lessonIds);
      return tx.academyPlaylist.create({ data: {
        ...course, published: true, thumbnailUrl: videos[0].thumbnailUrl,
        videos: { create: videos.map((video, index) => copyLesson(video, index)) },
      }, include: academyInclude });
    }, { isolationLevel: 'Serializable', timeout: 30_000 });
    return ok(serializeAcademyCollection(result), 201);
  } catch (e) { return fail(e); }
}
