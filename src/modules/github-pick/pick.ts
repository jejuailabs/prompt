// Shared (client-safe) types for 깃허브 픽 cards.
export type PickVideo = { videoId: string; title: string; channel: string; url: string; publishedAt: string };

export type PickUseCase = { who: string; how: string };

export type PickContent = {
  repo: string; // owner/name
  repoUrl: string;
  title: string; // Korean one-line headline
  oneLine: string;
  what: string[]; // up to 3 lines
  useCases: PickUseCase[];
  whyNow: string;
  install: string; // copied verbatim from the README, or ''
  prompts: string[];
  stars: number;
  language: string;
  license: string;
  pushedAt: string;
  topics: string[];
  videos: PickVideo[];
};

export type PickDTO = PickContent & {
  id: string;
  imageUrl: string | null;
  views: number;
  commentCount: number;
  createdAt: string;
};

export function formatStars(stars: number) {
  if (stars >= 10_000) return `${(stars / 10_000).toFixed(1).replace(/\.0$/, '')}만`;
  if (stars >= 1_000) return `${(stars / 1_000).toFixed(1).replace(/\.0$/, '')}천`;
  return String(stars);
}
