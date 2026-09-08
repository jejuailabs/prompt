// Server-only session helpers (demo cookie auth — swap point for real OAuth later)
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export const SESSION_COOKIE = 'pl_session';

export interface DbSessionUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  banned: boolean;
  title: string | null;
  credits: number;
}

export async function getSessionUser(): Promise<DbSessionUser | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const user = await db.profile.findUnique({
    where: { id },
    include: { credits: true },
  });
  if (!user || user.banned) return null;
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    banned: user.banned,
    title: user.title,
    credits: user.credits?.balance ?? 0,
  };
}

export async function requireUser(): Promise<DbSessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError('로그인이 필요합니다', 401);
  return user;
}

export async function requireAdmin(): Promise<DbSessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new HttpError('관리자 권한이 필요합니다', 403);
  return user;
}

export class HttpError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}
