// GET /api/modules — ALL modules incl. disabled (client filters)
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';
import { serializeModule } from '@/lib/server/serialize';

export async function GET() {
  try {
    const modules = await db.module.findMany({ orderBy: { navOrder: 'asc' } });
    return ok(modules.map(serializeModule));
  } catch (e) {
    return fail(e);
  }
}
