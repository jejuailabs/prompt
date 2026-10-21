import { HttpError, type DbSessionUser } from '@/lib/auth';
import { BOARDS, POST_BODY_MAX, POST_TITLE_MAX, isBoardId, type BoardId, type BoardPostDTO } from './boards';

// Board posts live in the generic Artifact table (type 'text'), like AI 일정,
// so likes/comments/views reuse the existing Vote/Comment/views columns.
export const BOARD_MODULE = 'community-board';

export type BoardRow = {
  id: string; ownerId: string; title: string; description: string; metadata: string; sourceModule: string | null; type: string;
  views: number; likeCount: number; commentCount: number; createdAt: Date;
  owner?: { id: string; username: string; avatarUrl: string | null } | null;
};

type BoardMeta = { board?: string; body?: string; number?: number };

function meta(raw: string): BoardMeta {
  try { return JSON.parse(raw) as BoardMeta; } catch { return {}; }
}

export function isBoardRow(row: { sourceModule: string | null; type: string } | null): boolean {
  return Boolean(row && row.sourceModule === BOARD_MODULE && row.type === 'text');
}

export function canEditPost(row: { ownerId: string }, user: Pick<DbSessionUser, 'id' | 'role'> | null) {
  return Boolean(user && (user.id === row.ownerId || user.role === 'admin'));
}

export function serializePost(row: BoardRow, user: Pick<DbSessionUser, 'id' | 'role'> | null, likedByMe: boolean, withBody = false): BoardPostDTO {
  const value = meta(row.metadata);
  const board: BoardId = isBoardId(value.board) ? value.board : 'free';
  return {
    id: row.id,
    number: value.number ?? 0,
    board,
    title: row.title,
    excerpt: row.description,
    ...(withBody ? { body: value.body ?? '' } : {}),
    author: { id: row.owner?.id ?? row.ownerId, username: row.owner?.username ?? '회원', avatarUrl: row.owner?.avatarUrl ?? null },
    views: row.views,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    likedByMe,
    createdAt: row.createdAt.toISOString(),
    canEdit: canEditPost(row, user),
  };
}

export function parsePostInput(raw: unknown, user: Pick<DbSessionUser, 'role'>) {
  const input = (raw ?? {}) as Record<string, unknown>;
  const board = input.board;
  if (!isBoardId(board)) throw new HttpError('게시판을 골라 주세요.', 400);
  if (BOARDS.find((item) => item.id === board)?.adminOnly && user.role !== 'admin') throw new HttpError('공지는 운영진만 쓸 수 있어요.', 403);
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!title) throw new HttpError('제목을 입력해 주세요.', 400);
  if (title.length > POST_TITLE_MAX) throw new HttpError(`제목은 ${POST_TITLE_MAX}자까지 쓸 수 있어요.`, 400);
  if (!body) throw new HttpError('내용을 입력해 주세요.', 400);
  if (body.length > POST_BODY_MAX) throw new HttpError(`내용은 ${POST_BODY_MAX.toLocaleString()}자까지 쓸 수 있어요.`, 400);
  return { board, title, body, excerpt: body.replace(/\s+/g, ' ').slice(0, 140) };
}
