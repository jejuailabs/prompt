// GET /api/pipelines — PipelineDTO[]
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';

export async function GET() {
  try {
    const pipelines = await db.pipeline.findMany({ orderBy: { id: 'asc' } });
    return ok(
      pipelines.map((p) => ({
        id: p.id,
        displayNameKo: p.displayNameKo,
        displayNameEn: p.displayNameEn,
        descKo: p.descKo,
        descEn: p.descEn,
        icon: p.icon,
        creditCost: p.creditCost,
        wide: p.wide,
        active: p.active,
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
