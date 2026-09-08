// Server-only session helpers — Supabase Auth (Google OAuth)
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';

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
  const supabase = await createClient();
  const { data: { user: supaUser } } = await supabase.auth.getUser();
  if (!supaUser) return null;

  const user = await db.profile.findUnique({
    where: { id: supaUser.id },
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

// Fast path for read-only routes: parses JWT locally, no network call.
// Only use for GET endpoints where user ID is needed for non-critical features (likedByMe etc).
export async function getSessionUserFast(): Promise<DbSessionUser | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const user = await db.profile.findUnique({
    where: { id: session.user.id },
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
