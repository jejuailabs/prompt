// GET /api/video-engine — Returns enabled video engines for Video Studio
// Admin users see all enabled engines; regular users see only non-adminOnly ones.
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

interface EngineEntry {
  engineId: string;
  enabled: boolean;
  adminOnly?: boolean;
  defaultModel: string;
  status: string;
}

const DEFAULT_CONFIG: EngineEntry[] = [
  { engineId: 'h3', enabled: true, adminOnly: false, defaultModel: 'h3', status: 'ready' },
  { engineId: 'wan', enabled: true, adminOnly: false, defaultModel: 'wan26', status: 'ready' },
  { engineId: 'ltx', enabled: true, adminOnly: false, defaultModel: 'ltx25', status: 'ready' },
];

export async function GET() {
  try {
    let config: EngineEntry[] = DEFAULT_CONFIG;
    try {
      const row = await db.setting.findUnique({ where: { key: 'video-engine-config' } });
      if (row) {
        try { config = JSON.parse(row.value); } catch { /* use default */ }
      }
    } catch {
      // Setting table may not exist yet — use defaults
    }

    const session = await getSessionUser().catch(() => null);
    const isAdmin = session?.role === 'admin';

    const engines = config
      .filter((c) => c.enabled && (!c.adminOnly || isAdmin))
      .map((c) => ({
        engineId: c.engineId,
        defaultModel: c.defaultModel,
        status: c.status,
        adminOnly: c.adminOnly ?? false,
      }));
    return ok(engines);
  } catch (e) {
    return fail(e);
  }
}
