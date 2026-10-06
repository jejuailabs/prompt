import { z } from 'zod';

export function youtubePlaylistUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname)) return null;
    const id = url.searchParams.get('list');
    return id && /^[a-zA-Z0-9_-]{10,100}$/.test(id) ? `https://www.youtube.com/playlist?list=${id}` : null;
  } catch { return null; }
}

export const importedLessonSchema = z.object({
  videoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(1000).default(''),
  channelTitle: z.string().max(160).default(''),
  durationSeconds: z.number().int().min(0).max(604800).nullable().default(null),
});
export type ImportedLesson = z.infer<typeof importedLessonSchema>;
export const createCourseSchema = z.object({
  title: z.string().trim().min(1, '강의 과정 이름을 입력해주세요').max(120),
  description: z.string().max(1000).default(''),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  videos: z.array(importedLessonSchema).max(100).default([]),
}).refine(course => new Set(course.videos.map(v => v.videoId)).size === course.videos.length, '중복된 영상이 있습니다.');

export function timestampSeconds(value?: string): number | null {
  if (!value || !/^\d{1,3}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const parts = value.split(':').map(Number);
  if (parts.slice(1).some(n => n > 59)) return null;
  return parts.reduce((sum, n) => sum * 60 + n, 0);
}

/** Keep the provider's playlist positions; omit deleted/private/duplicate entries. */
export function socialKitLessons(payload: unknown): ImportedLesson[] {
  const response = z.object({ success: z.literal(true), data: z.object({ type: z.literal('playlist'), results: z.array(z.unknown()) }) }).parse(payload);
  const rowSchema = z.object({ videoId: z.string(), title: z.string(), description: z.string().nullish(), channelName: z.string().nullish(), duration: z.string().nullish(), index: z.number().nullish() });
  const seen = new Set<string>();
  return response.data.results.map((row, order) => ({ row: rowSchema.safeParse(row), order }))
    .filter(item => item.row.success)
    .sort((a, b) => (a.row.data!.index ?? a.order) - (b.row.data!.index ?? b.order))
    .flatMap(({ row }) => {
      const data = row.data!;
      if (seen.has(data.videoId) || ['Private video', 'Deleted video', '[Private video]', '[Deleted video]'].includes(data.title)) return [];
      const parsed = importedLessonSchema.safeParse({ videoId: data.videoId, title: data.title.slice(0, 160), description: (data.description ?? '').slice(0, 1000), channelTitle: (data.channelName ?? '').slice(0, 160), durationSeconds: timestampSeconds(data.duration ?? undefined) });
      if (!parsed.success) return [];
      seen.add(data.videoId);
      return [parsed.data];
    });
}

export type CourseProgress = { completed: string[]; lastLesson?: string; notes: Record<string, string> };
export function readCourseProgress(raw: string | null, lessonIds: string[]): CourseProgress {
  const blank: CourseProgress = { completed: [], notes: {} };
  try {
    const parsed = z.object({ completed: z.array(z.string()), lastLesson: z.string().optional(), notes: z.record(z.string(), z.string()) }).parse(JSON.parse(raw ?? 'null'));
    return { completed: [...new Set(parsed.completed)].filter(id => lessonIds.includes(id)), lastLesson: lessonIds.includes(parsed.lastLesson ?? '') ? parsed.lastLesson : undefined, notes: Object.fromEntries(Object.entries(parsed.notes).filter(([id]) => lessonIds.includes(id))) };
  } catch { return blank; }
}
