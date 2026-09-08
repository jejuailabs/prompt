// POST /api/revenue/connect — demo payment account connect → active acct_demo_xxx
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<{ provider?: string }>(req).catch(() => ({}) as { provider?: string });
    const provider = body.provider?.trim() || 'stripe_connect';
    const suffix = Math.random().toString(36).slice(2, 10);

    const account = await db.paymentAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        provider,
        externalAccountId: `acct_demo_${suffix}`,
        status: 'active',
      },
      update: {
        provider,
        externalAccountId: `acct_demo_${suffix}`,
        status: 'active',
      },
    });

    return ok({
      provider: account.provider,
      status: account.status,
      externalAccountId: account.externalAccountId,
      totalEarned: account.totalEarned,
    });
  } catch (e) {
    return fail(e);
  }
}
