// Daily AI 일정 collector.
//   GET  — Vercel Cron (Authorization: Bearer $CRON_SECRET)
//   POST — admin "run now" ({ dryRun?: boolean, sources?: string[], maxAi?: number })
import { timingSafeEqual } from 'node:crypto';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { runIngest } from '@/modules/event-ingest/run';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function sameSecret(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new HttpError('CRON_SECRET이 설정되지 않았습니다.', 503);
  const given = Buffer.from(header ?? ''), expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  try {
    if (!sameSecret(req.headers.get('authorization'))) throw new HttpError('인증이 필요합니다.', 401);
    return ok(await runIngest());
  } catch (error) { return fail(error); }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as { dryRun?: unknown; sources?: unknown; maxAi?: unknown };
    const sources = Array.isArray(body.sources) ? body.sources.filter((item): item is string => typeof item === 'string') : undefined;
    const maxAi = typeof body.maxAi === 'number' && body.maxAi > 0 ? Math.min(body.maxAi, 100) : undefined;
    return ok(await runIngest({ dryRun: body.dryRun !== false, sources, maxAi }));
  } catch (error) { return fail(error); }
}
