// PATCH /api/admin/users — update role / banned flag
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeAdminUsers } from '@/lib/server/serialize';
import { API_ACCESS_PREFIX } from '@/lib/server/api-access';
import { logEvent } from '@/lib/events';

interface UserPatchBody {
  id?: string;
  role?: 'user' | 'admin';
  banned?: boolean;
  apiAccessAllowed?: boolean;
}

export async function PATCH(req: NextRequest) {
  try {
    const me = await requireAdmin();
    const body = await readJson<UserPatchBody>(req);
    if (!body.id) throw new HttpError('사용자 id가 필요합니다', 400);

    const profile = await db.profile.findUnique({ where: { id: body.id } });
    if (!profile) throw new HttpError('사용자를 찾을 수 없습니다', 404);

    const data: { role?: string; banned?: boolean } = {};
    if (body.role !== undefined) {
      if (body.role !== 'user' && body.role !== 'admin') {
        throw new HttpError('잘못된 역할값입니다', 400);
      }
      data.role = body.role;
    }
    if (body.banned !== undefined) data.banned = Boolean(body.banned);
    if (body.apiAccessAllowed !== undefined && typeof body.apiAccessAllowed !== 'boolean') throw new HttpError('API 허용 여부는 true 또는 false여야 합니다', 400);
    if (!Object.keys(data).length && body.apiAccessAllowed === undefined) throw new HttpError('변경할 내용이 없습니다', 400);

    // Any admin may appoint admins. Guard against locking the site out:
    // no one removes or bans themselves, and the last active admin always stays.
    const losesAdmin = profile.role === 'admin' && (data.role === 'user' || data.banned === true);
    if (losesAdmin && profile.id === me.id) throw new HttpError('내 관리자 권한은 직접 해제하거나 정지할 수 없습니다', 400);
    if (losesAdmin && (await db.profile.count({ where: { role: 'admin', banned: false } })) <= 1) {
      throw new HttpError('마지막 관리자는 해제할 수 없습니다', 400);
    }

    const updated = await db.$transaction(async (tx) => {
      const next = await tx.profile.update({ where: { id: profile.id }, data });
      if (body.apiAccessAllowed !== undefined) {
        const key = `${API_ACCESS_PREFIX}${profile.id}`;
        const value = JSON.stringify({ enabled: body.apiAccessAllowed, grantedBy: me.id, updatedAt: new Date().toISOString() });
        await tx.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
      }
      return next;
    });
    if (body.apiAccessAllowed !== undefined) await logEvent('ai.api.access.changed', { userId: profile.id, adminId: me.id, allowed: body.apiAccessAllowed });
    const [dto] = await serializeAdminUsers([updated]);
    return ok(dto);
  } catch (e) {
    return fail(e);
  }
}
