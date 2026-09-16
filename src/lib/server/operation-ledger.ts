import { db } from '@/lib/db';
import { logEvent } from '@/lib/events';
import { chargeCredits, refundCredits } from '@/lib/server/credits';

export type MeteredEngine = 'h3' | 'wan' | 'ltx' | 'flux' | 'blender' | 'whisper';

// All values are internal KRW estimates. They are deliberately stored with the
// operation so a future invoice import can replace the estimate without losing
// the original user charge.
const CATALOG: Record<MeteredEngine, { providerId: string; label: string; category: string; creditCharge: number; gpuKrwPerMinute: number }> = {
  h3: { providerId: 'runpod-h3', label: 'MiniMax H3 · Runpod', category: 'video', creditCharge: 80, gpuKrwPerMinute: 42 },
  wan: { providerId: 'runpod-wan', label: 'Wan · Runpod', category: 'video', creditCharge: 55, gpuKrwPerMinute: 30 },
  ltx: { providerId: 'runpod-ltx', label: 'LTX · Runpod', category: 'video', creditCharge: 50, gpuKrwPerMinute: 28 },
  flux: { providerId: 'runpod-flux', label: 'FLUX · Runpod', category: 'image', creditCharge: 18, gpuKrwPerMinute: 12 },
  blender: { providerId: 'runpod-blender', label: 'Blender · Runpod', category: '3d', creditCharge: 70, gpuKrwPerMinute: 24 },
  whisper: { providerId: 'runpod-whisper', label: 'Whisper · Runpod', category: 'audio', creditCharge: 15, gpuKrwPerMinute: 8 },
};

async function providerFor(engine: MeteredEngine) {
  const item = CATALOG[engine];
  return db.modelProvider.upsert({
    where: { id: item.providerId },
    create: {
      id: item.providerId,
      displayName: item.label,
      category: item.category,
      costPerUnit: item.gpuKrwPerMinute,
      marginRate: item.creditCharge / item.gpuKrwPerMinute,
      adapterType: 'runpod',
      adapterConfig: JSON.stringify({ engine, accounting: 'estimated_gpu_minutes_krw' }),
    },
    update: { displayName: item.label, category: item.category, active: true },
  });
}

export async function beginMeteredOperation(input: {
  userId: string;
  engine: MeteredEngine;
  prompt: string;
  aspect?: string;
  style?: string | null;
  preview?: boolean;
}) {
  const item = CATALOG[input.engine];
  const creditCharge = input.engine === 'h3' && input.preview ? Math.ceil(item.creditCharge / 2) : item.creditCharge;
  const provider = await providerFor(input.engine);
  const operation = await db.generationJob.create({
    data: {
      userId: input.userId,
      providerId: provider.id,
      promptText: input.prompt.slice(0, 4000),
      aspect: input.aspect ?? '1:1',
      style: input.style ?? null,
      status: 'queued',
      creditCharged: 0,
    },
  });

  try {
    await chargeCredits(input.userId, creditCharge, `${input.engine}_generation`, operation.id);
    await db.generationJob.update({ where: { id: operation.id }, data: { creditCharged: creditCharge } });
  } catch (error) {
    await db.generationJob.delete({ where: { id: operation.id } }).catch(() => undefined);
    throw error;
  }

  await logEvent('ai.operation.queued', { operationId: operation.id, userId: input.userId, engine: input.engine, creditCharged: creditCharge });
  return { operationId: operation.id, creditCharged: creditCharge };
}

export async function failMeteredOperation(operationId: string, error: string) {
  const operation = await db.generationJob.findUnique({ where: { id: operationId } });
  if (!operation || operation.status === 'failed' || operation.status === 'done') return;
  await db.generationJob.update({ where: { id: operation.id }, data: { status: 'failed', error: error.slice(0, 500), completedAt: new Date() } });
  await refundCredits(operation.userId, operation.creditCharged, operation.id);
  await logEvent('ai.operation.failed', { operationId: operation.id, userId: operation.userId, error: error.slice(0, 500), refunded: operation.creditCharged });
}

export async function finishMeteredOperation(input: {
  operationId?: string;
  engine: MeteredEngine;
  status: string;
  executionTimeMs?: number;
  error?: string;
}) {
  if (!input.operationId) return;
  const operation = await db.generationJob.findUnique({ where: { id: input.operationId } });
  if (!operation || operation.status === 'done' || operation.status === 'failed') return;
  const failed = input.status === 'FAILED' || input.status === 'CANCELLED' || input.status === 'TIMED_OUT';
  if (failed) return failMeteredOperation(operation.id, input.error || `Runpod ${input.status}`);
  if (input.status !== 'COMPLETED') {
    if (operation.status === 'queued') await db.generationJob.update({ where: { id: operation.id }, data: { status: 'running' } });
    return;
  }
  const minutes = Math.max(0, (input.executionTimeMs ?? 0) / 60_000);
  const costActual = Math.round(minutes * CATALOG[input.engine].gpuKrwPerMinute * 100) / 100;
  await db.generationJob.update({
    where: { id: operation.id },
    data: { status: 'done', costActual, completedAt: new Date(), error: null },
  });
  await logEvent('ai.operation.completed', { operationId: operation.id, engine: input.engine, estimatedCostKrw: costActual, executionTimeMs: input.executionTimeMs ?? 0 });
}
