// GET /api/quick-tools — public: returns enabled tool IDs in order
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';

const SETTING_KEY = 'quick-tools-config';

interface QuickToolConfig {
  id: string;
  enabled: boolean;
  order: number;
}

export async function GET() {
  try {
    let config: QuickToolConfig[] = [];
    try {
      const row = await db.setting.findUnique({ where: { key: SETTING_KEY } });
      if (row) config = JSON.parse(row.value);
    } catch { /* no config = show all */ }

    // empty config means "show all in default order"
    if (!config.length) return ok({ toolIds: [], mode: 'default' as const });

    const enabled = config.filter((c) => c.enabled).sort((a, b) => a.order - b.order);
    return ok({ toolIds: enabled.map((c) => c.id), mode: 'custom' as const });
  } catch (e) {
    return fail(e);
  }
}
