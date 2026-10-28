// GET/PATCH /api/admin/class-sessions/[id] — live detail, end/extend, board toggle, hide images, block students
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, getIdParam, ok, readJson } from '@/lib/server/handler';
import { toAdminDTO } from '@/modules/class-studio/admin-server';
import { expireStaleGenerations, toGenerationDTO } from '@/modules/class-studio/server';
import type { ClassSessionDetailDTO } from '@/modules/class-studio/types';

interface PatchBody {
  action?: 'close' | 'extend';
  extendMinutes?: number;
  boardPublic?: boolean;
  generationId?: string;
  hidden?: boolean;
  participantId?: string;
  blocked?: boolean;
}

function parseUsage(raw: string | null): Record<string, unknown> | null {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const id = getIdParam(await params);
    await expireStaleGenerations(id);
    const [participants, generations, used] = await Promise.all([
      db.classParticipant.findMany({ where: { sessionId: id }, orderBy: { createdAt: 'asc' } }),
      db.classGeneration.findMany({ where: { sessionId: id }, include: { participant: { select: { nickname: true } } }, orderBy: { createdAt: 'desc' } }),
      db.classGeneration.groupBy({ by: ['participantId'], where: { sessionId: id, status: { not: 'failed' } }, _count: { _all: true } }),
    ]);
    const detail: ClassSessionDetailDTO = {
      participants: participants.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        blocked: p.blocked,
        used: used.find((row) => row.participantId === p.id)?._count._all ?? 0,
        createdAt: p.createdAt.toISOString(),
      })),
      generations: generations.map((g) => ({
        ...toGenerationDTO(g),
        nickname: g.participant.nickname,
        hidden: g.hidden,
        rawError: g.error,
        usage: parseUsage(g.usage),
      })),
    };
    return ok(detail);
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const id = getIdParam(await params);
    const body = await readJson<PatchBody>(req);
    const session = await db.classSession.findUnique({ where: { id } });
    if (!session) throw new HttpError('세션을 찾을 수 없습니다', 404);

    if (body.action === 'close') {
      await db.classSession.update({ where: { id }, data: { closedAt: new Date() } });
    } else if (body.action === 'extend') {
      const minutes = Math.min(240, Math.max(5, Math.round(Number(body.extendMinutes) || 30)));
      // Extending an ended class reopens it from now; an open one gets more time at the end.
      const base = session.closedAt || session.endsAt < new Date() ? new Date() : session.endsAt;
      await db.classSession.update({ where: { id }, data: { closedAt: null, endsAt: new Date(base.getTime() + minutes * 60 * 1000) } });
    }
    if (typeof body.boardPublic === 'boolean') {
      await db.classSession.update({ where: { id }, data: { boardPublic: body.boardPublic } });
    }
    if (body.generationId && typeof body.hidden === 'boolean') {
      await db.classGeneration.updateMany({ where: { id: body.generationId, sessionId: id }, data: { hidden: body.hidden } });
    }
    if (body.participantId && typeof body.blocked === 'boolean') {
      await db.classParticipant.updateMany({ where: { id: body.participantId, sessionId: id }, data: { blocked: body.blocked } });
    }

    const updated = await db.classSession.findUniqueOrThrow({ where: { id }, include: { provider: true } });
    return ok(await toAdminDTO(updated));
  } catch (e) {
    return fail(e);
  }
}
