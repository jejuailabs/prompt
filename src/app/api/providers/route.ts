// GET /api/providers — active model providers for the lab
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';

export async function GET() {
  try {
    const providers = await db.modelProvider.findMany({ where: { active: true } });
    return ok(
      providers.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        category: p.category,
        costPerUnit: p.costPerUnit,
        active: p.active,
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
