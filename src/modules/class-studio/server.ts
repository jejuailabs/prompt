// Class studio server helpers: join codes, participant cookies, spend limits and the generation runner.
// Students never sign in. A participant is an httpOnly cookie token (sha256 stored) scoped to one session,
// and every image is paid by the platform within the session's budget — no student credits are involved.
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import sharp from 'sharp';
import type { ClassGeneration, ClassParticipant, ClassSession, ModelProvider } from '@prisma/client';
import { db } from '@/lib/db';
import { HttpError, assertApiAccessForUserId } from '@/lib/auth';
import { getImageAdapter, parseAdapterConfig, type ReferenceImage } from '@/lib/server/image-adapters';
import { downloadBuffer, publicStorageUrl, uploadBuffer } from '@/lib/server/storage';
import type { ClassGenerationDTO, ClassRoomState } from './types';

/** The one model classes use for now: the cheaper of the two GPT Image 2.5 variants. */
export const CLASS_PROVIDER_ID = 'gpt-image-25-flare';
export const CLASS_IMAGE_SIZE = '1024x1024';
export const MAX_PROMPT_LENGTH = 1000;
/** A job that has not finished in this long was lost (function timeout) and must stop blocking the student. */
const STALE_AFTER_MS = 6 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export type SessionWithProvider = ClassSession & { provider: ModelProvider };

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export async function createUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
    if (!(await db.classSession.findUnique({ where: { code } }))) return code;
  }
  throw new HttpError('입장 코드를 만들지 못했습니다. 다시 시도해주세요', 500);
}

export function roomState(session: Pick<ClassSession, 'startsAt' | 'endsAt' | 'closedAt'>, now = new Date()): ClassRoomState {
  if (session.closedAt || now >= session.endsAt) return 'ended';
  if (now < session.startsAt) return 'scheduled';
  return 'open';
}

export async function findSessionByCode(rawCode: string): Promise<SessionWithProvider> {
  const code = normalizeCode(rawCode);
  const session = code ? await db.classSession.findUnique({ where: { code }, include: { provider: true } }) : null;
  if (!session) throw new HttpError('수업을 찾을 수 없어요. 입장 코드를 확인해주세요', 404);
  return session;
}

// ─── participant cookie ───

const cookieName = (code: string) => `coai_class_${code}`;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function issueParticipantCookie(session: ClassSession): Promise<string> {
  const token = randomBytes(32).toString('hex');
  (await cookies()).set(cookieName(session.code), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Long enough for the class (plus a day to look back at the results), never longer.
    expires: new Date(session.endsAt.getTime() + 24 * 60 * 60 * 1000),
  });
  return hashToken(token);
}

export async function currentParticipant(session: ClassSession): Promise<ClassParticipant | null> {
  const token = (await cookies()).get(cookieName(session.code))?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const participant = await db.classParticipant.findUnique({ where: { tokenHash: hashToken(token) } });
  return participant?.sessionId === session.id ? participant : null;
}

export async function requireParticipant(session: ClassSession): Promise<ClassParticipant> {
  const participant = await currentParticipant(session);
  if (!participant) throw new HttpError('먼저 닉네임을 입력하고 입장해주세요', 401);
  if (participant.blocked) throw new HttpError('선생님이 이 기기의 생성을 멈췄어요', 403);
  return participant;
}

export function requireOpen(session: ClassSession): void {
  const state = roomState(session);
  if (state === 'scheduled') throw new HttpError('아직 수업이 시작되지 않았어요', 403);
  if (state === 'ended') throw new HttpError('수업이 끝났어요', 403);
}

// ─── spend accounting ───

/** Settled cost of finished images plus the reserved cost of images still in flight. */
export async function committedSpend(session: SessionWithProvider): Promise<number> {
  const [done, inflight] = await Promise.all([
    db.classGeneration.aggregate({ where: { sessionId: session.id, status: 'done' }, _sum: { costActual: true } }),
    db.classGeneration.count({ where: { sessionId: session.id, status: { in: ['queued', 'running'] } } }),
  ]);
  return (done._sum.costActual ?? 0) + inflight * session.provider.costPerUnit;
}

/** Failed images do not count against the student's allowance. */
export function usedCount(participantId: string): Promise<number> {
  return db.classGeneration.count({ where: { participantId, status: { not: 'failed' } } });
}

export async function expireStaleGenerations(sessionId: string): Promise<void> {
  await db.classGeneration.updateMany({
    where: { sessionId, status: { in: ['queued', 'running'] }, createdAt: { lt: new Date(Date.now() - STALE_AFTER_MS) } },
    data: { status: 'failed', error: 'timeout: no result within 6 minutes', completedAt: new Date() },
  });
}

// ─── DTOs ───

export function referenceUrl(path: string | null): string | null {
  return path ? publicStorageUrl(path) : null;
}

/** Turn a raw provider failure into something a student can act on. */
export function studentError(raw: string | null): string | null {
  if (!raw) return null;
  if (/moderation|safety|content.?policy|rejected/i.test(raw)) return '안전 기준에 맞지 않아 만들지 못했어요. 표현을 바꿔서 다시 해보세요.';
  if (raw.startsWith('timeout')) return '시간이 너무 오래 걸려 멈췄어요. 다시 시도해주세요.';
  return '이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.';
}

export function toGenerationDTO(gen: ClassGeneration): ClassGenerationDTO {
  return {
    id: gen.id,
    promptText: gen.promptText,
    referenceUrl: referenceUrl(gen.referencePath),
    status: gen.status as ClassGenerationDTO['status'],
    resultUrl: gen.resultUrl,
    error: gen.status === 'failed' ? studentError(gen.error) : null,
    createdAt: gen.createdAt.toISOString(),
  };
}

// ─── runner ───

/** Runs one queued image. Safe to call repeatedly: only a still-queued row is picked up. */
export async function processClassGeneration(id: string): Promise<void> {
  const gen = await db.classGeneration.findUnique({ where: { id }, include: { session: { include: { provider: true } } } });
  if (!gen) return;
  const started = await db.classGeneration.updateMany({ where: { id, status: 'queued' }, data: { status: 'running' } });
  if (started.count === 0) return;
  const { session } = gen;
  try {
    // The host pays; their paid-API approval must still hold when the image actually runs.
    await assertApiAccessForUserId(session.hostId);
    const adapter = getImageAdapter(session.provider.adapterType);
    const config = parseAdapterConfig(session.provider.adapterConfig);
    const refs: ReferenceImage[] = [];
    if (gen.referencePath) {
      const prefix = `class-ref/${session.id}/${gen.participantId}/`;
      if (!gen.referencePath.startsWith(prefix) || gen.referencePath.includes('..')) throw new Error('invalid reference path');
      refs.push({ buffer: await downloadBuffer(gen.referencePath), mimeType: 'image/jpeg' });
    }
    const prompt = [gen.promptText, session.provider.styleHint].filter(Boolean).join(', ');
    const { buffer, usage } = await adapter.generate(prompt, CLASS_IMAGE_SIZE, config, refs);
    const png = await sharp(buffer).png().toBuffer();
    const resultUrl = await uploadBuffer(`class/${session.id}/${gen.id}.png`, png, 'image/png');
    await db.classGeneration.updateMany({
      where: { id, status: 'running' },
      data: {
        status: 'done',
        resultUrl,
        costActual: session.provider.costPerUnit,
        usage: usage ? JSON.stringify(usage) : null,
        completedAt: new Date(),
      },
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message.slice(0, 500) : 'unknown error';
    console.error('[class-studio] generation failed', id);
    await db.classGeneration.updateMany({ where: { id, status: { in: ['queued', 'running'] } }, data: { status: 'failed', error: raw, completedAt: new Date() } });
  }
}
