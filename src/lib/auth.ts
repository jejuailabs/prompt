// Server-only session helpers — Supabase Auth (Google OAuth)
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';

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
  const bearer = (await headers()).get('authorization');
  if (bearer?.startsWith('Bearer pl_mcp_')) {
    if ((await headers()).get('x-playlab-mcp-allowed') !== '1') return null;
    const token = bearer.slice(7);
    if (!/^pl_mcp_[a-f0-9]{64}$/.test(token)) return null;
    const credential = await db.mcpToken.findUnique({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
      include: { owner: { include: { credits: true } } },
    });
    const profile = credential?.owner;
    if (!profile || profile.banned) return null;
    return { id: profile.id, username: profile.username, avatarUrl: profile.avatarUrl, role: profile.role, banned: profile.banned, title: profile.title, credits: profile.credits?.balance ?? 0 };
  }
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

// Verify the identity with Auth before using it for ownership checks.
// getSession() only reads cookies and cannot establish a trusted server identity.
export async function getSessionUserFast(): Promise<DbSessionUser | null> {
  if ((await headers()).get('authorization')?.startsWith('Bearer pl_mcp_')) return getSessionUser();
  const supabase = await createClient();
  const { data: { user: u }, error } = await supabase.auth.getUser();
  if (error || !u) return null;
  return {
    id: u.id,
    username: u.user_metadata?.name ?? u.email?.split('@')[0] ?? '',
    avatarUrl: u.user_metadata?.avatar_url ?? null,
    role: 'user',
    banned: false,
    title: null,
    credits: 0,
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
