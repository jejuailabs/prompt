// GET /api/class/[code] — class room state for this browser (login-free; participant = httpOnly cookie)
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';
import { committedSpend, currentParticipant, expireStaleGenerations, findSessionByCode, roomState, toGenerationDTO, usedCount } from '@/modules/class-studio/server';
import type { ClassRoomDTO } from '@/modules/class-studio/types';

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await findSessionByCode((await params).code);
    await expireStaleGenerations(session.id);
    const [participant, participants, spent] = await Promise.all([
      currentParticipant(session),
      db.classParticipant.count({ where: { sessionId: session.id } }),
      committedSpend(session),
    ]);
    const generations = participant
      ? await db.classGeneration.findMany({ where: { participantId: participant.id }, orderBy: { createdAt: 'asc' } })
      : [];
    const room: ClassRoomDTO = {
      code: session.code,
      title: session.title,
      state: roomState(session),
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      modelName: session.provider.displayName,
      perUserLimit: session.perUserLimit,
      me: participant ? { nickname: participant.nickname, blocked: participant.blocked, used: await usedCount(participant.id) } : null,
      generations: generations.map(toGenerationDTO),
      budgetExhausted: spent + session.provider.costPerUnit > session.budgetKrw,
      full: participants >= session.maxParticipants,
    };
    return ok(room);
  } catch (e) {
    return fail(e);
  }
}
