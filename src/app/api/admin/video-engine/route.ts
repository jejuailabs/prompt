// GET + PATCH /api/admin/video-engine — Video generation engine config
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { logEvent } from '@/lib/events';

const SETTING_KEY = 'video-engine-config';

interface EnginePatchBody {
  engineId: string;
  enabled?: boolean;
  adminOnly?: boolean;
  defaultModel?: string;
  runpodEndpointId?: string | null;
  status?: string;
}

const DEFAULT_CONFIG = [
  { engineId: 'h3', enabled: true, adminOnly: false, defaultModel: 'h3', status: 'ready', runpodEndpointId: null },
  { engineId: 'wan', enabled: true, adminOnly: false, defaultModel: 'wan26', status: 'ready', runpodEndpointId: null },
  { engineId: 'ltx', enabled: true, adminOnly: false, defaultModel: 'ltx25', status: 'ready', runpodEndpointId: null },
];

async function getConfig() {
  try {
    const row = await db.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!row) return [...DEFAULT_CONFIG];
    try { return JSON.parse(row.value); } catch { return [...DEFAULT_CONFIG]; }
  } catch {
    return [...DEFAULT_CONFIG];
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const config = await getConfig();
    return ok(config);
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<EnginePatchBody>(req);
    if (!body.engineId) throw new HttpError('engineId is required', 400);

    const config = await getConfig();
    const idx = config.findIndex((c: { engineId: string }) => c.engineId === body.engineId);
    if (idx === -1) throw new HttpError('Unknown engine', 404);

    if (body.enabled !== undefined) config[idx].enabled = Boolean(body.enabled);
    if (body.adminOnly !== undefined) config[idx].adminOnly = Boolean(body.adminOnly);
    if (body.defaultModel) config[idx].defaultModel = body.defaultModel;
    if (body.runpodEndpointId !== undefined) config[idx].runpodEndpointId = body.runpodEndpointId;
    if (body.status) config[idx].status = body.status;

    await db.setting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: JSON.stringify(config) },
      update: { value: JSON.stringify(config) },
    });

    await logEvent('video-engine.updated', { engineId: body.engineId, ...config[idx] });

    return ok(config[idx]);
  } catch (e) {
    return fail(e);
  }
}
