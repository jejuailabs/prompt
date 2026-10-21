// COAI news (docs/coai/04 §2): summary + staff commentary + source link.
// Never republish full articles — keep to a 3-line summary and a link.
export type NewsCategory = 'domestic' | 'global' | 'update' | 'policy';

export const NEWS_CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: 'domestic', label: '국내' },
  { id: 'global', label: '해외' },
  { id: 'update', label: '서비스 업데이트' },
  { id: 'policy', label: '정책' },
];

export function isNewsCategory(value: unknown): value is NewsCategory {
  return typeof value === 'string' && NEWS_CATEGORIES.some((item) => item.id === value);
}

export function newsCategoryLabel(id: string) {
  return NEWS_CATEGORIES.find((item) => item.id === id)?.label ?? '뉴스';
}

export type NewsDTO = {
  id: string;
  category: NewsCategory;
  title: string;
  summary: string[];
  commentary: string;
  meaning: string;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string | null;
  views: number;
  commentCount: number;
  createdAt: string;
};

export type NewsInput = Omit<NewsDTO, 'id' | 'views' | 'commentCount' | 'createdAt'>;
