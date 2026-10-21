// COAI community boards (docs/coai/04 커뮤니티). Client-safe definitions.
export type BoardId = 'free' | 'qna' | 'study' | 'notice';
export type BoardTab = 'all' | BoardId | 'gallery';

export type BoardDef = { id: BoardId; label: string; tone: 'general' | 'qna' | 'tip' | 'notice'; hint: string; adminOnly?: boolean };

export const BOARDS: BoardDef[] = [
  { id: 'free', label: '자유', tone: 'general', hint: 'AI로 해 본 것, 재밌었던 일, 소소한 이야기' },
  { id: 'qna', label: '질문', tone: 'qna', hint: '"이거 어떻게 해요?" 막힌 곳을 물어보세요' },
  { id: 'study', label: '학습일지', tone: 'tip', hint: '오늘 배운 것과 과제 결과를 기록해요' },
  { id: 'notice', label: '공지', tone: 'notice', hint: '운영진 공지와 모임 안내', adminOnly: true },
];

export const BOARD_TABS: { id: BoardTab; label: string }[] = [
  { id: 'all', label: '전체' },
  ...BOARDS.map((board) => ({ id: board.id, label: board.label })),
  { id: 'gallery', label: '갤러리' },
];

export function boardDef(id: string | undefined) {
  return BOARDS.find((board) => board.id === id);
}

export function isBoardId(value: unknown): value is BoardId {
  return typeof value === 'string' && BOARDS.some((board) => board.id === value);
}

export const POST_TITLE_MAX = 120;
export const POST_BODY_MAX = 10_000;

export type BoardPostDTO = {
  id: string;
  number: number;
  board: BoardId;
  title: string;
  excerpt: string;
  body?: string;
  author: { id: string; username: string; avatarUrl?: string | null };
  views: number;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
  canEdit: boolean;
};
