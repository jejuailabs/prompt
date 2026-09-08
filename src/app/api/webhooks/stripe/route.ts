// POST /api/webhooks/stripe — Stripe webhook handler
// Handles checkout.session.completed → add credits
// Handles account.updated → update Connect account status
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/server/stripe';
import { addCredits } from '@/lib/server/credits';
import { logEvent } from '@/lib/events';
import { db } from '@/lib/db';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const credits = Number(session.metadata?.credits);
      if (userId && credits > 0) {
        await addCredits(userId, credits, 'purchase', session.id);
        await logEvent('credits.purchased', {
          userId,
          credits,
          provider: 'stripe',
          sessionId: session.id,
          amountTotal: session.amount_total,
          currency: session.currency,
        });
      }
      break;
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      if (account.id) {
        const paymentAccount = await db.paymentAccount.findFirst({
          where: { externalAccountId: account.id },
        });
        if (paymentAccount) {
          const chargesEnabled = account.charges_enabled;
          const payoutsEnabled = account.payouts_enabled;
          const newStatus = chargesEnabled && payoutsEnabled ? 'active' : 'pending';
          await db.paymentAccount.update({
            where: { id: paymentAccount.id },
            data: { status: newStatus },
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
