import { requireAdmin, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/server/handler';
export async function GET() {
  try {
    await requireAdmin();
    return ok(await db.creditTransaction.findMany({ where: { reason: 'topup_pending' }, include: { user: { select: { username: true } } }, orderBy: { createdAt: 'asc' } }));
  } catch (error) { return fail(error); }
}
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const { id, action } = await readJson<{ id?: string; action?: string }>(req);
    if (!id || !['approve', 'reject'].includes(action ?? '')) throw new HttpError('잘못된 승인 요청입니다', 400);
    return ok(await db.$transaction(async (tx) => {
      const request = await tx.creditTransaction.findUnique({ where: { id } });
      if (!request) throw new HttpError('요청을 찾을 수 없습니다', 404);
      const claimed = await tx.creditTransaction.updateMany({ where: { id, reason: 'topup_pending' }, data: { reason: action === 'approve' ? 'topup_approved' : 'topup_rejected', relatedId: admin.id, amount: action === 'approve' ? 500 : 0 } });
      if (!claimed.count) throw new HttpError('이미 처리된 요청입니다', 409);
      if (action === 'approve') await tx.credits.upsert({ where: { userId: request.userId }, create: { userId: request.userId, balance: 500 }, update: { balance: { increment: 500 } } });
      return { status: action === 'approve' ? 'approved' : 'rejected' };
    }));
  } catch (error) { return fail(error); }
}
