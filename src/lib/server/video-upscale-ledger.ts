import { db } from '@/lib/db';
import { logEvent } from '@/lib/events';
import { chargeCredits, refundCredits } from '@/lib/server/credits';

const ENGINE = 'upscale';
const PROVIDER_ID = 'runpod-seedvr2';
const GPU_KRW_PER_MINUTE = 36;

async function provider() {
  return db.modelProvider.upsert({
    where: { id: PROVIDER_ID },
    create: { id: PROVIDER_ID, displayName: 'SeedVR2 · Runpod', category: 'video', costPerUnit: GPU_KRW_PER_MINUTE, marginRate: 1, adapterType: 'runpod', adapterConfig: JSON.stringify({ engine: ENGINE, accounting: 'estimated_gpu_minutes_krw' }) },
    update: { displayName: 'SeedVR2 · Runpod', category: 'video', active: true },
  });
}

export async function beginVideoUpscaleOperation(input: { userId: string; prompt: string; aspect: string; style: string | null; creditCharge: number }) {
  const modelProvider = await provider();
  const operation = await db.generationJob.create({ data: { userId: input.userId, providerId: modelProvider.id, promptText: input.prompt.slice(0, 4000), aspect: input.aspect, style: input.style, status: 'queued', creditCharged: 0 } });
  try {
    await chargeCredits(input.userId, input.creditCharge, 'video_upscale', operation.id);
    await db.generationJob.update({ where: { id: operation.id }, data: { creditCharged: input.creditCharge } });
  } catch (error) {
    await db.generationJob.delete({ where: { id: operation.id } }).catch(() => undefined);
    throw error;
  }
  await logEvent('ai.operation.queued', { operationId: operation.id, userId: input.userId, engine: ENGINE, creditCharged: input.creditCharge });
  return { operationId: operation.id, creditCharged: input.creditCharge };
}

export async function finishVideoUpscaleOperation(input: { operationId?: string; status: string; executionTimeMs?: number; error?: string }) {
  if (!input.operationId) return;
  const operation = await db.generationJob.findUnique({ where: { id: input.operationId } });
  if (!operation || operation.status === 'done' || operation.status === 'failed') return;
  const failed = ['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(input.status);
  if (failed) {
    await db.generationJob.update({ where: { id: operation.id }, data: { status: 'failed', error: (input.error ?? `Runpod ${input.status}`).slice(0, 500), completedAt: new Date() } });
    await refundCredits(operation.userId, operation.creditCharged, operation.id);
    await logEvent('ai.operation.failed', { operationId: operation.id, userId: operation.userId, engine: ENGINE, refunded: operation.creditCharged });
    return;
  }
  if (input.status !== 'COMPLETED') {
    if (operation.status === 'queued') await db.generationJob.update({ where: { id: operation.id }, data: { status: 'running' } });
    return;
  }
  const costActual = Math.round(Math.max(0, (input.executionTimeMs ?? 0) / 60_000) * GPU_KRW_PER_MINUTE * 100) / 100;
  await db.generationJob.update({ where: { id: operation.id }, data: { status: 'done', costActual, completedAt: new Date(), error: null } });
  await logEvent('ai.operation.completed', { operationId: operation.id, engine: ENGINE, estimatedCostKrw: costActual, executionTimeMs: input.executionTimeMs ?? 0 });
}
