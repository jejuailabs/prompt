// Payment provider adapter pattern
// Phase 4 swaps DemoProvider → StripeProvider without touching credit logic.
import { addCredits } from '@/lib/server/credits';

export interface PurchaseResult {
  balance: number;
  transactionId?: string;
}

export interface IPaymentProvider {
  name: string;
  createCheckout(userId: string, amount: number): Promise<PurchaseResult>;
}

// ── Demo provider: instant credit top-up with no real payment ──
class DemoPaymentProvider implements IPaymentProvider {
  name = 'demo';
  async createCheckout(userId: string, amount: number): Promise<PurchaseResult> {
    const balance = await addCredits(userId, amount, 'purchase');
    return { balance };
  }
}

// ── Stripe provider: placeholder for Phase 4 ──
class StripePaymentProvider implements IPaymentProvider {
  name = 'stripe';
  async createCheckout(_userId: string, _amount: number): Promise<PurchaseResult> {
    // Phase 4: implement Stripe Checkout Session creation
    // 1. Create Stripe Checkout Session with amount
    // 2. Return session URL for client redirect
    // 3. On webhook confirmation, call addCredits()
    throw new Error('Stripe 결제는 아직 준비 중입니다');
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
