// POST /api/class/[code]/join — enter a class with a nickname only; issues the participant cookie
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { currentParticipant, findSessionByCode, issueParticipantCookie, requireOpen } from '@/modules/class-studio/server';

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await findSessionByCode((await params).code);
    requireOpen(session);
    const { nickname: raw } = await readJson<{ nickname?: string }>(req);
    const nickname = (raw ?? '').replace(/\s+/g, ' ').trim();
    if (nickname.length < 1 || nickname.length > 12) throw new HttpError('닉네임은 1~12자로 입력해주세요', 400);

    const existing = await currentParticipant(session);
    if (existing) return ok({ nickname: existing.nickname });

    const count = await db.classParticipant.count({ where: { sessionId: session.id } });
    if (count >= session.maxParticipants) throw new HttpError(`정원(${session.maxParticipants}명)이 모두 찼어요. 선생님께 알려주세요`, 403);
    if (await db.classParticipant.findUnique({ where: { sessionId_nickname: { sessionId: session.id, nickname } } })) {
      throw new HttpError('이미 쓰고 있는 닉네임이에요. 다른 닉네임을 써주세요', 409);
    }

    const tokenHash = await issueParticipantCookie(session);
    await db.classParticipant.create({ data: { id: randomUUID(), sessionId: session.id, nickname, tokenHash } });
    return ok({ nickname });
  } catch (e) {
    return fail(e);
  }
}
