// Payment provider adapter pattern
// PAYMENT_PROVIDER=demo → instant free top-up
// PAYMENT_PROVIDER=stripe → Stripe Checkout Session (webhook completes the purchase)
import { addCredits } from '@/lib/server/credits';
import { findPackage, getStripe } from '@/lib/server/stripe';

export interface PurchaseResult {
  balance: number;
  checkoutUrl?: string;
}

export interface IPaymentProvider {
  name: string;
  createCheckout(userId: string, creditAmount: number, origin?: string): Promise<PurchaseResult>;
}

// ── Demo provider: instant credit top-up with no real payment ──
class DemoPaymentProvider implements IPaymentProvider {
  name = 'demo';
  async createCheckout(userId: string, creditAmount: number): Promise<PurchaseResult> {
    const balance = await addCredits(userId, creditAmount, 'purchase');
    return { balance };
  }
}

// ── Stripe provider: creates a Checkout Session, credits added on webhook ──
class StripePaymentProvider implements IPaymentProvider {
  name = 'stripe';
  async createCheckout(userId: string, creditAmount: number, origin?: string): Promise<PurchaseResult> {
    const pkg = findPackage(creditAmount);
    if (!pkg) throw new Error('지원되지 않는 충전 금액입니다');

    const stripe = getStripe();
    const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || 'https://prompt-two-theta.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'krw',
      line_items: [{
        price_data: {
          currency: 'krw',
          unit_amount: pkg.priceKrw,
          product_data: {
            name: pkg.label,
            description: `PLAYLAB 크레딧 ${pkg.credits.toLocaleString()}개`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        userId,
        credits: String(pkg.credits),
      },
      success_url: `${baseUrl}?checkout=success`,
      cancel_url: `${baseUrl}?checkout=cancel`,
    });

    return { balance: -1, checkoutUrl: session.url ?? undefined };
  }
}

const providers: Record<string, IPaymentProvider> = {
  demo: new DemoPaymentProvider(),
  stripe: new StripePaymentProvider(),
};

export function getPaymentProvider(): IPaymentProvider {
  const providerName = process.env.PAYMENT_PROVIDER || 'demo';
  return providers[providerName] || providers.demo;
}
