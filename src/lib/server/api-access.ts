import { db } from '@/lib/db';

export const API_ACCESS_PREFIX = 'ai.api.access.';
export const API_ACCESS_DENIED = 'AI API는 관리자와 관리자가 허용한 회원만 사용할 수 있습니다.';

type ApiUser = { id: string; role: string; banned: boolean };

export function hasApiGrant(raw: string | null | undefined): boolean {
  try {
    const grant = JSON.parse(raw || 'null');
    return grant?.enabled === true && typeof grant.grantedBy === 'string' && grant.grantedBy.length > 0;
  } catch { return false; }
}

/** Always read server-owned grants; cookies and user-editable metadata cannot grant access. */
export async function canUsePaidApi(user: ApiUser): Promise<boolean> {
  if (user.banned) return false;
  if (user.role === 'admin') return true;
  const setting = await db.setting.findUnique({ where: { key: `${API_ACCESS_PREFIX}${user.id}` } });
  return hasApiGrant(setting?.value);
}

export async function apiAccessByUser(users: ApiUser[]): Promise<Map<string, boolean>> {
  const keys = users.filter((user) => user.role !== 'admin' && !user.banned).map((user) => `${API_ACCESS_PREFIX}${user.id}`);
  const rows = keys.length ? await db.setting.findMany({ where: { key: { in: keys } } }) : [];
  const grants = new Map(rows.map((row) => [row.key, hasApiGrant(row.value)]));
  return new Map(users.map((user) => [user.id, !user.banned && (user.role === 'admin' || grants.get(`${API_ACCESS_PREFIX}${user.id}`) === true)]));
}
