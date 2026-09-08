// GET /api/revenue — RevenueOverviewDTO (own payment account + revenue shares)
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const user = await requireUser();

    const [account, shares] = await Promise.all([
      db.paymentAccount.findUnique({ where: { userId: user.id } }),
      db.revenueShare.findMany({
        where: { payeeUserId: user.id },
        include: { artifact: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const period = currentPeriod();
    const totals = {
      thisMonth: shares.filter((s) => s.period === period).reduce((sum, s) => sum + s.amount, 0),
      pending: shares.filter((s) => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0),
      lifetime: shares.reduce((sum, s) => sum + s.amount, 0),
    };

    const monthlyMap = new Map<string, number>();
    for (const s of shares) {
      monthlyMap.set(s.period, (monthlyMap.get(s.period) ?? 0) + s.amount);
    }
    const monthly = [...monthlyMap.entries()]
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return ok({
      account: account
        ? {
            provider: account.provider,
            status: account.status,
            externalAccountId: account.externalAccountId,
            totalEarned: account.totalEarned,
          }
        : null,
      shares: shares.map((s) => ({
        id: s.id,
        artifactId: s.artifactId,
        artifactTitle: s.artifact?.title,
        payeeUserId: s.payeeUserId,
        sharePercent: s.sharePercent,
        amount: s.amount,
        period: s.period,
        status: s.status as 'pending' | 'settled',
      })),
      totals,
      monthly,
    });
  } catch (e) {
    return fail(e);
  }
}
