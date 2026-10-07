import { z } from 'zod';
import type { AcademyLibraryDTO, AcademyPlaylistDTO } from '@/lib/types';

export function youtubeVideoId(value: string): string | null {
  const input = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(url.hostname)) return null;
    const id = url.hostname === 'youtu.be' ? url.pathname.split('/').filter(Boolean)[0]
      : (url.pathname === '/watch' ? url.searchParams.get('v') : null) ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1];
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export const createLessonSchema = z.object({
  url: z.string().max(2048).refine(value => value.trim().startsWith('https://') && !!youtubeVideoId(value), 'YouTube 영상 주소를 입력해주세요. 재생목록 주소는 사용할 수 없어요.'),
  title: z.string().trim().max(160).default(''),
  description: z.string().max(1000).default(''),
  studyContent: z.string().max(50000).default(''),
  analyze: z.boolean().default(true),
});
const courseFields = z.object({
  title: z.string().trim().min(1, '강의 과정 이름을 입력해주세요').max(120),
  description: z.string().max(1000),
  sortOrder: z.number().int().min(0).max(10000),
  lessonIds: z.array(z.string().min(1).max(100)).min(2, '두 개 이상의 영상을 선택해 강의로 묶어주세요.').max(100),
});
export const createCourseSchema = courseFields.extend({ description: courseFields.shape.description.default(''), sortOrder: courseFields.shape.sortOrder.default(0) }).strict().refine(course => new Set(course.lessonIds).size === course.lessonIds.length, '같은 영상은 한 강의에 한 번만 넣을 수 있어요.');
export const updateCourseSchema = courseFields.partial().strict().refine(course => !course.lessonIds || new Set(course.lessonIds).size === course.lessonIds.length, '같은 영상은 한 강의에 한 번만 넣을 수 있어요.');

export function timestampSeconds(value?: string): number | null {
  if (!value || !/^\d{1,3}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const parts = value.split(':').map(Number);
  if (parts.slice(1).some(n => n > 59)) return null;
  return parts.reduce((sum, n) => sum * 60 + n, 0);
}

/** A video remains independently available even when reused in multiple courses. */
export function buildAcademyLibrary(collections: AcademyPlaylistDTO[]): AcademyLibraryDTO {
  const courses = collections.filter(course => course.videos.length >= 2);
  const lessons = new Map<string, AcademyLibraryDTO['lessons'][number]>();
  for (const collection of [...collections].sort((a,b) => Number(a.videos.length !== 1) - Number(b.videos.length !== 1))) {
    for (const video of collection.videos) {
      const key = video.videoId || video.id;
      const previous = lessons.get(key);
      const courseIds = collection.videos.length >= 2 ? [collection.id] : [];
      if (previous) previous.courseIds = [...new Set([...previous.courseIds, ...courseIds])];
      else lessons.set(key, { ...video, collectionId: collection.id, courseIds, isExample: collection.isExample });
    }
  }
  return { lessons: [...lessons.values()], courses };
}

export type CourseProgress = { completed: string[]; lastLesson?: string; notes: Record<string, string> };
export function readCourseProgress(raw: string | null, lessonIds: string[]): CourseProgress {
  const blank: CourseProgress = { completed: [], notes: {} };
  try {
    const parsed = z.object({ completed: z.array(z.string()), lastLesson: z.string().optional(), notes: z.record(z.string(), z.string()) }).parse(JSON.parse(raw ?? 'null'));
    return { completed: [...new Set(parsed.completed)].filter(id => lessonIds.includes(id)), lastLesson: lessonIds.includes(parsed.lastLesson ?? '') ? parsed.lastLesson : undefined, notes: Object.fromEntries(Object.entries(parsed.notes).filter(([id]) => lessonIds.includes(id))) };
  } catch { return blank; }
}
