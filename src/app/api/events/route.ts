// GET /api/events?limit=12 — recent activity events (payload parsed)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/server/handler';
import { serializeEvent } from '@/lib/server/serialize';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 12, 1), 50);
    const events = await db.eventLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    return ok(events.map(serializeEvent));
  } catch (e) {
    return fail(e);
  }
}
