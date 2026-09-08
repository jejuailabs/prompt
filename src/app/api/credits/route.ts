// GET /api/credits — CreditStateDTO (balance, monthlyUsed, monthlyLimit, transactions)
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

export const MONTHLY_LIMIT = 50000;

export async function GET() {
  try {
    const user = await requireUser();
    const credits = await db.credits.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance: 0 },
      update: {},
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [transactions, monthlyAgg] = await Promise.all([
      db.creditTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      db.creditTransaction.aggregate({
        where: { userId: user.id, amount: { lt: 0 }, createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    return ok({
      balance: credits.balance,
      monthlyUsed: Math.abs(monthlyAgg._sum.amount ?? 0),
      monthlyLimit: MONTHLY_LIMIT,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        reason: t.reason,
        relatedId: t.relatedId,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return fail(e);
  }
}
