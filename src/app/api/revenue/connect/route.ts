// POST /api/revenue/connect — payment account connect
// PAYMENT_PROVIDER=demo: instant active account with fake ID
// PAYMENT_PROVIDER=stripe: creates Stripe Connect account, returns onboarding URL
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<{ provider?: string }>(req).catch(() => ({}) as { provider?: string });
    const isStripe = process.env.PAYMENT_PROVIDER === 'stripe';

    if (isStripe) {
      return await handleStripeConnect(user.id, req);
    }

    // Demo mode
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

async function handleStripeConnect(userId: string, req: NextRequest) {
  const { getStripe } = await import('@/lib/server/stripe');
  const stripe = getStripe();
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://prompt-two-theta.vercel.app';

  // Check if user already has a Connect account
  const existing = await db.paymentAccount.findUnique({ where: { userId } });

  let accountId: string;

  if (existing?.externalAccountId && !existing.externalAccountId.startsWith('acct_demo_')) {
    accountId = existing.externalAccountId;
  } else {
    // Create new Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'KR',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { userId },
    });
    accountId = account.id;

    await db.paymentAccount.upsert({
      where: { userId },
      create: {
        userId,
        provider: 'stripe_connect',
        externalAccountId: accountId,
        status: 'pending',
      },
      update: {
        provider: 'stripe_connect',
        externalAccountId: accountId,
        status: 'pending',
      },
    });
  }

  // Create account onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}?connect=refresh`,
    return_url: `${origin}?connect=success`,
    type: 'account_onboarding',
  });

  return ok({
    provider: 'stripe_connect',
    status: 'pending',
    externalAccountId: accountId,
    onboardingUrl: accountLink.url,
  });
}
