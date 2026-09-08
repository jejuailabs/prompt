// PATCH /api/admin/users — update role / banned flag
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeAdminUsers } from '@/lib/server/serialize';

interface UserPatchBody {
  id?: string;
  role?: 'user' | 'admin';
  banned?: boolean;
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
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
    if (!Object.keys(data).length) throw new HttpError('변경할 내용이 없습니다', 400);

    const updated = await db.profile.update({ where: { id: profile.id }, data });
    const [dto] = await serializeAdminUsers([updated]);
    return ok(dto);
  } catch (e) {
    return fail(e);
  }
}
