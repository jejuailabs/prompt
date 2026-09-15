import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';
export async function POST() {
  try {
    const user = await requireUser();
    const request = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`credit-request:${user.id}`}))`;
      const existing = await tx.creditTransaction.findFirst({ where: { userId: user.id, reason: 'topup_pending' } });
      return existing ?? tx.creditTransaction.create({ data: { userId: user.id, amount: 0, reason: 'topup_pending' } });
    });
    return ok({ requestId: request.id, amount: 500, status: 'pending', message: '관리자의 승인을 대기 중입니다. 승인 후 500크레딧이 지급됩니다.' });
  } catch (error) { return fail(error); }
}
