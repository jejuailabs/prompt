import { HttpError } from '@/lib/auth';
import { isNewsCategory, type NewsDTO, type NewsInput } from './news';

// News items are text artifacts owned by staff (same storage pattern as AI 일정).
export const NEWS_MODULE = 'coai-news';

export type NewsRow = { id: string; title: string; metadata: string; views: number; commentCount: number; createdAt: Date; sourceModule: string | null; type: string };

function httpsUrl(value: unknown, field: string, required: boolean) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) { if (required) throw new HttpError(`${field}을 입력해 주세요.`, 400); return ''; }
  try { const url = new URL(text); if (url.protocol !== 'https:') throw new Error(); return url.toString(); }
  catch { throw new HttpError(`${field}은 https:// 로 시작하는 주소여야 해요.`, 400); }
}

function text(value: unknown, field: string, max: number, required = true) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (required && !result) throw new HttpError(`${field}을 입력해 주세요.`, 400);
  if (result.length > max) throw new HttpError(`${field}은 ${max.toLocaleString()}자까지 쓸 수 있어요.`, 400);
  return result;
}

export function parseNewsInput(raw: unknown): NewsInput {
  const input = (raw ?? {}) as Record<string, unknown>;
  if (!isNewsCategory(input.category)) throw new HttpError('분류를 골라 주세요.', 400);
  const summary = (Array.isArray(input.summary) ? input.summary : []).map((line) => (typeof line === 'string' ? line.trim() : '')).filter(Boolean).slice(0, 3);
  if (summary.length === 0) throw new HttpError('3줄 요약을 한 줄 이상 입력해 주세요.', 400);
  if (summary.some((line) => line.length > 200)) throw new HttpError('요약 한 줄은 200자까지 쓸 수 있어요.', 400);
  return {
    category: input.category,
    title: text(input.title, '제목', 120),
    summary,
    commentary: text(input.commentary, '운영진 해설', 4000, false),
    meaning: text(input.meaning, '"나한테 무슨 의미?"', 600, false),
    sourceName: text(input.sourceName, '출처 이름', 60),
    sourceUrl: httpsUrl(input.sourceUrl, '원문 링크', true),
    imageUrl: httpsUrl(input.imageUrl, '대표 이미지 주소', false) || null,
  };
}

export function serializeNews(row: NewsRow): NewsDTO | null {
  if (row.sourceModule !== NEWS_MODULE || row.type !== 'text') return null;
  try {
    const value = JSON.parse(row.metadata) as { news?: Partial<NewsInput> };
    const news = value.news ?? {};
    return {
      id: row.id,
      category: isNewsCategory(news.category) ? news.category : 'domestic',
      title: row.title,
      summary: Array.isArray(news.summary) ? news.summary : [],
      commentary: news.commentary ?? '',
      meaning: news.meaning ?? '',
      sourceName: news.sourceName ?? '',
      sourceUrl: news.sourceUrl ?? '',
      imageUrl: news.imageUrl ?? null,
      views: row.views,
      commentCount: row.commentCount,
      createdAt: row.createdAt.toISOString(),
    };
  } catch { return null; }
}
