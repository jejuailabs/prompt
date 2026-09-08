// PATCH /api/admin/modules — Phase deploy switch (enabled / status / newUntil)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeModule } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';

interface ModulePatchBody {
  id?: string;
  enabled?: boolean;
  status?: string;
  newUntil?: string | null;
}

const VALID_STATUSES = ['active', 'new', 'beta', 'coming-soon'];

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<ModulePatchBody>(req);
    if (!body.id) throw new HttpError('moduleId가 필요합니다', 400);

    const existing = await db.module.findUnique({ where: { id: body.id } });
    if (!existing) throw new HttpError('모듈을 찾을 수 없습니다', 404);

    const data: { enabled?: boolean; status?: string; newUntil?: Date | null } = {};
    if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) throw new HttpError('잘못된 상태값입니다', 400);
      data.status = body.status;
    }
    if (body.newUntil !== undefined) {
      if (body.newUntil === null) {
        data.newUntil = null;
      } else {
        const d = new Date(body.newUntil);
        if (Number.isNaN(d.getTime())) throw new HttpError('잘못된 날짜 형식입니다', 400);
        data.newUntil = d;
      }
    }
    if (!Object.keys(data).length) throw new HttpError('변경할 내용이 없습니다', 400);

    const updated = await db.module.update({ where: { id: existing.id }, data });
    await logEvent('module.updated', {
      moduleId: updated.id,
      enabled: updated.enabled,
      status: updated.status,
    });

    return ok(serializeModule(updated));
  } catch (e) {
    return fail(e);
  }
}
