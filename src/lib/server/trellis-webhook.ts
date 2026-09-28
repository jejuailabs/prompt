import { createHmac, timingSafeEqual } from 'node:crypto';

function webhookToken(projectId: string, operationId: string): string {
  const key = process.env.RUNPOD_API_KEY;
  if (!key) throw new Error('RUNPOD_API_KEY is not configured');
  return createHmac('sha256', key).update(`trellis:${projectId}:${operationId}`).digest('hex');
}

export function trellisWebhookUrl(projectId: string, operationId: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://prompt-two-theta.vercel.app';
  const url = new URL('/api/webhooks/trellis', origin);
  if (url.protocol !== 'https:') throw new Error('TRELLIS webhook requires HTTPS');
  url.searchParams.set('project', projectId);
  url.searchParams.set('token', webhookToken(projectId, operationId));
  return url.toString();
}

export function validTrellisWebhookToken(projectId: string, operationId: string, candidate: string): boolean {
  const expected = Buffer.from(webhookToken(projectId, operationId), 'hex');
  if (!/^[a-f0-9]{64}$/.test(candidate)) return false;
  return timingSafeEqual(expected, Buffer.from(candidate, 'hex'));
}
