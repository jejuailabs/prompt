// POST /api/credits/purchase — top-up via payment adapter
// Demo mode: instant credit add, returns { balance }
// Stripe mode: returns { checkoutUrl } for redirect
import { NextRequest } from 'next/server';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { getPaymentProvider } from '@/lib/server/payment-adapters';

const ALLOWED_AMOUNTS = [1000, 5000, 10000, 50000];

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<{ amount?: number }>(req);
    const amount = Number(body.amount);
    if (!ALLOWED_AMOUNTS.includes(amount)) {
      throw new HttpError('지원되지 않는 충전 금액입니다', 400);
    }

    const origin = req.headers.get('origin') || undefined;
    const provider = getPaymentProvider();
    const result = await provider.createCheckout(user.id, amount, origin);

    return ok({
      balance: result.balance >= 0 ? result.balance : undefined,
      checkoutUrl: result.checkoutUrl,
      provider: provider.name,
    });
  } catch (e) {
    return fail(e);
  }
}
