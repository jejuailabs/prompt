// POST /api/game-room/[id]/moderate — admin approves or rejects a submitted game.
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(); const { id } = await params; const { action } = await readJson<{ action?: 'approve' | 'reject' }>(req);
    if (action !== 'approve' && action !== 'reject') throw new HttpError('처리 방식을 선택해주세요');
    const game = await db.artifact.findFirst({ where: { id, type: 'game' } });
    if (!game) throw new HttpError('게임을 찾을 수 없습니다', 404);
    const metadata = { ...(JSON.parse(game.metadata || '{}') as Record<string, unknown>), moderationStatus: action === 'approve' ? 'approved' : 'rejected' };
    await db.artifact.update({ where: { id }, data: { status: action === 'approve' ? 'published' : 'hidden', metadata: JSON.stringify(metadata) } });
    return ok({ status: action });
  } catch (e) { return fail(e); }
}
