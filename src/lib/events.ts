// Event-based extension point (docs/02 §4) — modules communicate via events only
import { db } from '@/lib/db';

export async function logEvent(type: string, payload: Record<string, unknown> = {}) {
  try {
    await db.eventLog.create({ data: { type, payload: JSON.stringify(payload) } });
  } catch (e) {
    console.error('logEvent failed', type, e);
  }
}
