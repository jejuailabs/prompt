// 깃허브 픽 cards are text artifacts (same storage pattern as AI 뉴스 / AI 일정).
import type { PickContent, PickDTO } from './pick';

export const PICK_MODULE = 'github-pick';
/** Ledger of every repo already looked at, so a repo is never paid for (AI) twice. */
export const PICK_LEDGER_MODULE = 'github-pick-ingest';

export type PickRow = { id: string; title: string; metadata: string; fileUrl: string | null; views: number; commentCount: number; createdAt: Date; sourceModule: string | null; type: string };

export function serializePick(row: PickRow): PickDTO | null {
  if (row.sourceModule !== PICK_MODULE || row.type !== 'text') return null;
  try {
    const pick = (JSON.parse(row.metadata) as { pick?: Partial<PickContent> }).pick;
    if (!pick?.repo) return null;
    return {
      id: row.id, repo: pick.repo, repoUrl: pick.repoUrl ?? `https://github.com/${pick.repo}`, title: row.title, oneLine: pick.oneLine ?? '',
      what: pick.what ?? [], useCases: pick.useCases ?? [], whyNow: pick.whyNow ?? '', install: pick.install ?? '', prompts: pick.prompts ?? [],
      stars: pick.stars ?? 0, language: pick.language ?? '', license: pick.license ?? '', pushedAt: pick.pushedAt ?? '', topics: pick.topics ?? [],
      videos: pick.videos ?? [], imageUrl: row.fileUrl, views: row.views, commentCount: row.commentCount, createdAt: row.createdAt.toISOString(),
    };
  } catch { return null; }
}
