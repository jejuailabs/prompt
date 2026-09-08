// POST /api/credits/purchase — demo top-up {amount} → {balance}
import { NextRequest } from 'next/server';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { addCredits } from '@/lib/server/credits';

const ALLOWED_AMOUNTS = [1000, 5000, 10000, 50000];

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<{ amount?: number }>(req);
    const amount = Number(body.amount);
    if (!ALLOWED_AMOUNTS.includes(amount)) {
      throw new HttpError('지원되지 않는 충전 금액입니다', 400);
    }
    const balance = await addCredits(user.id, amount, 'purchase');
    return ok({ balance });
  } catch (e) {
    return fail(e);
  }
}
