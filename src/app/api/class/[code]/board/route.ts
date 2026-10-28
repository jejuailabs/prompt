// GET /api/class/[code]/board — the class wall: every finished, not-hidden image with its author's nickname.
// Readable without login while the admin keeps the board public.
import { db } from '@/lib/db';
import { HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { findSessionByCode, referenceUrl, roomState } from '@/modules/class-studio/server';
import type { ClassBoardDTO } from '@/modules/class-studio/types';

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await findSessionByCode((await params).code);
    if (!session.boardPublic) throw new HttpError('선생님이 보드를 닫아두었어요', 403);
    const rows = await db.classGeneration.findMany({
      where: { sessionId: session.id, status: 'done', hidden: false, resultUrl: { not: null }, participant: { blocked: false } },
      include: { participant: { select: { nickname: true } } },
      orderBy: { completedAt: 'desc' },
      take: 300,
    });
    const board: ClassBoardDTO = {
      title: session.title,
      state: roomState(session),
      cards: rows.map((row) => ({
        id: row.id,
        nickname: row.participant.nickname,
        promptText: row.promptText,
        resultUrl: row.resultUrl!,
        referenceUrl: referenceUrl(row.referencePath),
        createdAt: (row.completedAt ?? row.createdAt).toISOString(),
      })),
    };
    return ok(board);
  } catch (e) {
    return fail(e);
  }
}
