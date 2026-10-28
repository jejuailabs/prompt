// POST /api/class/[code]/process — run one of this student's queued images (client-triggered, one per call)
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/server/handler';
import { findSessionByCode, processClassGeneration, requireParticipant, toGenerationDTO } from '@/modules/class-studio/server';

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await findSessionByCode((await params).code);
    const participant = await requireParticipant(session);
    const { id } = await readJson<{ id?: string }>(req);
    const gen = id ? await db.classGeneration.findUnique({ where: { id } }) : null;
    if (!gen || gen.participantId !== participant.id) return ok({ processed: false });
    if (gen.status === 'queued') await processClassGeneration(gen.id);
    const latest = await db.classGeneration.findUnique({ where: { id: gen.id } });
    return ok({ processed: true, generation: latest ? toGenerationDTO(latest) : null });
  } catch (e) {
    return fail(e);
  }
}
