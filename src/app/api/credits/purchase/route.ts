// POST /api/credits/purchase — top-up via payment adapter {amount} → {balance}
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
    const provider = getPaymentProvider();
    const result = await provider.createCheckout(user.id, amount);
    return ok({ balance: result.balance, provider: provider.name });
  } catch (e) {
    return fail(e);
  }
}
