// Admin-side aggregation for class sessions.
import { db } from '@/lib/db';
import { roomState, type SessionWithProvider } from './server';
import type { ClassSessionAdminDTO } from './types';

export async function toAdminDTO(session: SessionWithProvider): Promise<ClassSessionAdminDTO> {
  const [participants, byStatus, spent] = await Promise.all([
    db.classParticipant.count({ where: { sessionId: session.id } }),
    db.classGeneration.groupBy({ by: ['status'], where: { sessionId: session.id }, _count: { _all: true } }),
    db.classGeneration.aggregate({ where: { sessionId: session.id, status: 'done' }, _sum: { costActual: true } }),
  ]);
  const count = (status: string) => byStatus.find((row) => row.status === status)?._count._all ?? 0;
  return {
    id: session.id,
    code: session.code,
    title: session.title,
    state: roomState(session),
    startsAt: session.startsAt.toISOString(),
    endsAt: (session.closedAt && session.closedAt < session.endsAt ? session.closedAt : session.endsAt).toISOString(),
    maxParticipants: session.maxParticipants,
    perUserLimit: session.perUserLimit,
    budgetKrw: session.budgetKrw,
    boardPublic: session.boardPublic,
    providerId: session.providerId,
    modelName: session.provider.displayName,
    unitCost: session.provider.costPerUnit,
    participants,
    generated: count('done'),
    failed: count('failed'),
    spentKrw: spent._sum.costActual ?? 0,
  };
}
