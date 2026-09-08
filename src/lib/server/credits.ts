// Atomic credit charge / refund / add helpers (Prisma transactions)
import { db } from '@/lib/db';
import { HttpError } from '@/lib/auth';

export async function getBalance(userId: string): Promise<number> {
  const credits = await db.credits.upsert({
    where: { userId },
    create: { userId, balance: 0 },
    update: {},
  });
  return credits.balance;
}

/** Charge credits atomically. Throws '크레딧이 부족합니다' (400) when balance is insufficient. */
export async function chargeCredits(
  userId: string,
  amount: number,
  reason: string,
  relatedId?: string,
): Promise<number> {
  if (amount <= 0) return getBalance(userId);
  return db.$transaction(async (tx) => {
    const credits = await tx.credits.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });
    if (credits.balance < amount) {
      throw new HttpError('크레딧이 부족합니다', 400);
    }
    await tx.creditTransaction.create({
      data: { userId, amount: -amount, reason, relatedId: relatedId ?? null },
    });
    const updated = await tx.credits.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });
    return updated.balance;
  });
}

/** Refund credits (positive transaction reason 'refund' + balance increment). */
export async function refundCredits(userId: string, amount: number, relatedId?: string): Promise<void> {
  if (amount <= 0) return;
  await db.$transaction(async (tx) => {
    await tx.creditTransaction.create({
      data: { userId, amount, reason: 'refund', relatedId: relatedId ?? null },
    });
    await tx.credits.upsert({
      where: { userId },
      create: { userId, balance: amount },
      update: { balance: { increment: amount } },
    });
  });
}

/** Add credits (demo purchase / bonus). */
export async function addCredits(
  userId: string,
  amount: number,
  reason: string,
  relatedId?: string,
): Promise<number> {
  return db.$transaction(async (tx) => {
    await tx.creditTransaction.create({
      data: { userId, amount, reason, relatedId: relatedId ?? null },
    });
    const updated = await tx.credits.upsert({
      where: { userId },
      create: { userId, balance: amount },
      update: { balance: { increment: amount } },
    });
    return updated.balance;
  });
}
