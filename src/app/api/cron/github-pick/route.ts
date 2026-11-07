// Daily 깃허브 픽 collector.
//   GET  — Vercel Cron (Authorization: Bearer $CRON_SECRET)
//   POST — admin "run now" ({ dryRun?: boolean, perDay?: number, maxAi?: number, days?: number }) — dryRun defaults to true
import { timingSafeEqual } from 'node:crypto';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { runGithubPick } from '@/modules/github-pick/run';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function sameSecret(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new HttpError('CRON_SECRET이 설정되지 않았습니다.', 503);
  const given = Buffer.from(header ?? ''), expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const count = (value: unknown, max: number) => (typeof value === 'number' && value > 0 ? Math.min(Math.floor(value), max) : undefined);

export async function GET(req: Request) {
  try {
    if (!sameSecret(req.headers.get('authorization'))) throw new HttpError('인증이 필요합니다.', 401);
    return ok(await runGithubPick());
  } catch (error) { return fail(error); }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return ok(await runGithubPick({ dryRun: body.dryRun !== false, perDay: count(body.perDay, 10), maxAi: count(body.maxAi, 30), days: count(body.days, 60) }));
  } catch (error) { return fail(error); }
}
