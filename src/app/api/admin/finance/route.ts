import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { logEvent } from '@/lib/events';

export async function GET() {
  try {
    await requireAdmin();
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [profiles, balances, jobs, creditTx, engineRows] = await Promise.all([
      db.profile.count(),
      db.credits.aggregate({ _sum: { balance: true } }),
      db.generationJob.aggregate({ _sum: { creditCharged: true, costActual: true }, _count: true }),
      db.creditTransaction.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { amount: true } }),
      db.generationJob.groupBy({ by: ['providerId', 'status'], _count: true, _sum: { creditCharged: true, costActual: true } }),
    ]);
    const providers = await db.modelProvider.findMany({ where: { id: { in: [...new Set(engineRows.map((row) => row.providerId))] } }, select: { id: true, displayName: true, category: true } });
    const providerById = new Map(providers.map((provider) => [provider.id, provider]));
    const engineMap = new Map<string, { providerId: string; label: string; category: string; total: number; completed: number; failed: number; credits: number; estimatedCostKrw: number }>();
    for (const row of engineRows) {
      const existing = engineMap.get(row.providerId) ?? { providerId: row.providerId, label: providerById.get(row.providerId)?.displayName ?? row.providerId, category: providerById.get(row.providerId)?.category ?? 'other', total: 0, completed: 0, failed: 0, credits: 0, estimatedCostKrw: 0 };
      existing.total += row._count;
      existing.completed += row.status === 'done' ? row._count : 0;
      existing.failed += row.status === 'failed' ? row._count : 0;
      existing.credits += row._sum.creditCharged ?? 0;
      existing.estimatedCostKrw += row._sum.costActual ?? 0;
      engineMap.set(row.providerId, existing);
    }
    const charged = jobs._sum.creditCharged ?? 0;
    const cost = jobs._sum.costActual ?? 0;
    return ok({
      members: profiles,
      outstandingCredits: balances._sum.balance ?? 0,
      jobs: jobs._count,
      chargedCredits: charged,
      estimatedCostKrw: cost,
      estimatedMarginKrw: charged - cost,
      monthlyNetCreditFlow: creditTx._sum.amount ?? 0,
      engines: [...engineMap.values()].sort((a, b) => b.credits - a.credits),
    });
  } catch (error) { return fail(error); }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await readJson<{ userId?: string; amount?: number; memo?: string }>(req);
    const userId = body.userId?.trim();
    const amount = Math.round(Number(body.amount));
    if (!userId || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) throw new HttpError('유효한 회원과 조정 크레딧을 입력해주세요', 400);
    const result = await db.$transaction(async (tx) => {
      const target = await tx.profile.findUnique({ where: { id: userId } });
      if (!target) throw new HttpError('회원을 찾을 수 없습니다', 404);
      const credits = await tx.credits.upsert({ where: { userId }, create: { userId, balance: 0 }, update: {} });
      if (credits.balance + amount < 0) throw new HttpError('잔액보다 많이 회수할 수 없습니다', 400);
      const updated = await tx.credits.update({ where: { userId }, data: { balance: { increment: amount } } });
      const transaction = await tx.creditTransaction.create({ data: { userId, amount, reason: 'admin_adjustment', relatedId: admin.id } });
      return { username: target.username, balance: updated.balance, transactionId: transaction.id };
    });
    await logEvent('credits.admin_adjusted', { adminId: admin.id, userId, amount, memo: body.memo?.slice(0, 300) ?? '', balance: result.balance });
    return ok(result);
  } catch (error) { return fail(error); }
}
