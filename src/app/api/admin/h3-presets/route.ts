import { requireAdmin, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { logEvent } from '@/lib/events';
import { ok, fail, readJson } from '@/lib/server/handler';
import { getH3Config, H3_CONFIG_KEY, type H3Config } from '@/lib/server/h3-config';
import { isH3Preset } from '@/lib/h3-presets';
import { NextRequest } from 'next/server';
export async function GET() {
  try { await requireAdmin(); return ok(await getH3Config()); } catch (e) { return fail(e); }
}
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await readJson<H3Config>(req);
    if (!isH3Preset(body.speed) || !isH3Preset(body.quality) || !['5090', 'blackwell'].includes(body.gpu)) throw new HttpError('설정값을 확인해주세요', 400);
    const previous = await getH3Config();
    const config: H3Config = { speed: body.speed, quality: body.quality, gpu: body.gpu, revision: new Date().toISOString() };
    await db.setting.upsert({ where: { key: H3_CONFIG_KEY }, create: { key: H3_CONFIG_KEY, value: JSON.stringify(config) }, update: { value: JSON.stringify(config) } });
    await logEvent('admin.h3.presets.updated', { adminId: admin.id, previous, config });
    return ok(config);
  } catch (e) { return fail(e); }
}
