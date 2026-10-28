// POST /api/class/[code]/generate — queue one image for this student.
// Limits checked inside one serializable transaction: room open, not blocked, one image at a time,
// per-student allowance (failed ones don't count) and the session's platform-paid budget.
// The client then calls /process with the returned id (same polling pattern as the model lab).
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { MAX_PROMPT_LENGTH, findSessionByCode, requireOpen, requireParticipant, toGenerationDTO } from '@/modules/class-studio/server';

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await findSessionByCode((await params).code);
    requireOpen(session);
    const participant = await requireParticipant(session);
    const body = await readJson<{ prompt?: string; referencePath?: string | null }>(req);
    const promptText = (body.prompt ?? '').trim();
    if (!promptText) throw new HttpError('만들고 싶은 그림을 적어주세요', 400);
    if (promptText.length > MAX_PROMPT_LENGTH) throw new HttpError(`프롬프트는 ${MAX_PROMPT_LENGTH}자까지 쓸 수 있어요`, 400);
    const referencePath = typeof body.referencePath === 'string' && body.referencePath ? body.referencePath : null;
    if (referencePath && (!referencePath.startsWith(`class-ref/${session.id}/${participant.id}/`) || referencePath.includes('..') || !referencePath.endsWith('.jpg'))) {
      throw new HttpError('첨부 사진을 다시 올려주세요', 400);
    }

    const unitCost = session.provider.costPerUnit;
    const gen = await db.$transaction(async (tx) => {
      const [inflightMine, usedMine, done, inflightAll] = await Promise.all([
        tx.classGeneration.count({ where: { participantId: participant.id, status: { in: ['queued', 'running'] } } }),
        tx.classGeneration.count({ where: { participantId: participant.id, status: { not: 'failed' } } }),
        tx.classGeneration.aggregate({ where: { sessionId: session.id, status: 'done' }, _sum: { costActual: true } }),
        tx.classGeneration.count({ where: { sessionId: session.id, status: { in: ['queued', 'running'] } } }),
      ]);
      if (inflightMine > 0) throw new HttpError('지금 만드는 그림이 끝나면 다음 그림을 만들 수 있어요', 409);
      if (usedMine >= session.perUserLimit) throw new HttpError(`이번 수업에서 만들 수 있는 ${session.perUserLimit}장을 모두 썼어요`, 403);
      if ((done._sum.costActual ?? 0) + (inflightAll + 1) * unitCost > session.budgetKrw) {
        throw new HttpError('이번 수업 예산을 모두 사용했어요. 선생님께 알려주세요', 403);
      }
      return tx.classGeneration.create({
        data: { id: randomUUID(), sessionId: session.id, participantId: participant.id, promptText, referencePath },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return ok(toGenerationDTO(gen));
  } catch (e) {
    // Two taps racing on the same limits: one wins, the other is asked to retry.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') {
      return fail(new HttpError('요청이 몰렸어요. 한 번만 다시 눌러주세요', 409));
    }
    return fail(e);
  }
}
