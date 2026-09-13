// GET + PATCH /api/admin/quick-tools — Quick start tool visibility & ordering
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';

const SETTING_KEY = 'quick-tools-config';

export interface QuickToolConfig {
  id: string;
  enabled: boolean;
  order: number;
}

async function getConfig(): Promise<QuickToolConfig[]> {
  try {
    const row = await db.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!row) return [];
    try { return JSON.parse(row.value); } catch { return []; }
  } catch {
    return [];
  }
}

// GET — returns saved config (empty array means "show all in default order")
export async function GET() {
  try {
    await requireAdmin();
    const config = await getConfig();
    return ok(config);
  } catch (e) {
    return fail(e);
  }
}

// PATCH — toggle one tool or reorder
interface PatchBody {
  id: string;
  enabled?: boolean;
  order?: number;
}

// PUT — bulk save all tool configs at once
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<QuickToolConfig[]>(req);
    if (!Array.isArray(body)) throw new HttpError('Expected array', 400);

    await db.setting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: JSON.stringify(body) },
      update: { value: JSON.stringify(body) },
    });

    return ok(body);
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<PatchBody>(req);
    if (!body.id) throw new HttpError('id is required', 400);

    const config = await getConfig();
    const idx = config.findIndex((c) => c.id === body.id);

    if (idx === -1) {
      config.push({ id: body.id, enabled: body.enabled ?? true, order: body.order ?? config.length });
    } else {
      if (body.enabled !== undefined) config[idx].enabled = body.enabled;
      if (body.order !== undefined) config[idx].order = body.order;
    }

    await db.setting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: JSON.stringify(config) },
      update: { value: JSON.stringify(config) },
    });

    return ok(config);
  } catch (e) {
    return fail(e);
  }
}
