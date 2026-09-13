// GET /api/providers — active model providers for the lab
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';

export async function GET() {
  try {
    // The model laboratory is image-only. Runpod video/3D providers are kept
    // in the same ledger for admin accounting but must not be selectable by
    // the image adapter runner.
    const providers = await db.modelProvider.findMany({
      where: { active: true, category: 'image', adapterType: { not: 'runpod' } },
    });
    return ok(
      providers.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        category: p.category,
        costPerUnit: p.costPerUnit,
        marginRate: (p as Record<string, unknown>).marginRate as number ?? 1.4,
        active: p.active,
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
