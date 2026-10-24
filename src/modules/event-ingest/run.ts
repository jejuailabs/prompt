// Daily collector: sources → new links only → read page → AI rewrite → poster → publish to AI 일정.
// Every processed link is remembered in a ledger (Artifact, sourceModule 'event-ingest') so nothing is paid for twice.
import { db } from '@/lib/db';
import { EVENT_MODULE, eventData } from '@/modules/ai-events/server';
import { collectStubs, type Stub } from './adapters';
import { AiUnavailableError, extractEvent } from './extract';
import { pageText, posterCandidates } from './html';
import { decodeBody, fetchLimited, robotsAllowed, sleep } from './net';
import { pickPoster, uploadPoster } from './poster';
import { SOURCES } from './sources';

export const LEDGER_MODULE = 'event-ingest';
const MAX_ATTEMPTS = 3;

export type RunOptions = { dryRun?: boolean; sources?: string[]; maxAi?: number };
export type ItemResult = { source: string; title: string; url: string; result: 'published' | 'irrelevant' | 'ended' | 'invalid' | 'duplicate' | 'blocked' | 'error' | 'preview'; detail?: string; poster?: boolean; preview?: unknown };
export type RunReport = { dryRun: boolean; sources: Record<string, { found: number; fresh: number; error?: string }>; aiCalls: number; published: number; aborted?: string; items: ItemResult[] };

// Titles that are never an event/course/contest — skipped before any page fetch or AI call.
const SKIP_TITLE = /채용|스태프|알바|입찰|용역|낙찰|사칭|휴관|업무협약|MOU|주거래금고|개인정보|안전 ?점검|휴무/i;
const norm = (title: string) => title.toLowerCase().replace(/[^0-9a-z가-힣]/g, '');

async function ownerId() {
  const fixed = process.env.INGEST_OWNER_ID?.trim();
  if (fixed) return fixed;
  const admin = await db.profile.findFirst({ where: { role: 'admin' }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (!admin) throw new Error('관리자 프로필을 찾을 수 없습니다 (INGEST_OWNER_ID 설정 필요)');
  return admin.id;
}

// Two overlapping runs (e.g. the cron "Run" button pressed twice) would publish the same event twice.
const LOCK_MODULE = 'event-ingest-lock';
const LOCK_TTL_MS = 6 * 60_000;

async function takeLock(owner: string) {
  const held = await db.artifact.findFirst({ where: { sourceModule: LOCK_MODULE }, select: { id: true, metadata: true } });
  const since = held ? Number((JSON.parse(held.metadata) as { at?: number }).at ?? 0) : 0;
  if (held && Date.now() - since < LOCK_TTL_MS) return null;
  const metadata = JSON.stringify({ at: Date.now() });
  if (held) { await db.artifact.update({ where: { id: held.id }, data: { metadata } }); return held.id; }
  return (await db.artifact.create({ data: { ownerId: owner, type: 'text', sourceModule: LOCK_MODULE, title: 'lock', status: 'hidden', visibility: 'unlisted', metadata } })).id;
}

export async function runIngest(options: RunOptions = {}): Promise<RunReport> {
  if (options.dryRun) return collect(options);
  const lock = await takeLock(await ownerId());
  if (!lock) return { dryRun: false, sources: {}, aiCalls: 0, published: 0, aborted: '이미 다른 수집이 실행 중입니다', items: [] };
  try { return await collect(options); }
  finally { await db.artifact.update({ where: { id: lock }, data: { metadata: JSON.stringify({ at: 0 }) } }).catch(() => undefined); }
}

async function collect(options: RunOptions): Promise<RunReport> {
  const dryRun = Boolean(options.dryRun);
  const maxAi = options.maxAi ?? (Number(process.env.INGEST_MAX_AI) || 40);
  const report: RunReport = { dryRun, sources: {}, aiCalls: 0, published: 0, items: [] };
  const owner = dryRun ? '' : await ownerId();

  // 1) collect links from every source (one failing source never stops the others)
  const picked: { stub: Stub; max: number }[] = [];
  const all: { stub: Stub; max: number }[] = [];
  for (const source of SOURCES.filter((item) => !options.sources || options.sources.includes(item.id))) {
    try {
      const stubs = await collectStubs(source);
      report.sources[source.id] = { found: stubs.length, fresh: 0 };
      stubs.forEach((stub) => all.push({ stub, max: source.max }));
    } catch (error) { report.sources[source.id] = { found: 0, fresh: 0, error: (error as Error).message }; }
  }

  // 2) drop what the ledger already knows
  const ledger = await db.artifact.findMany({ where: { sourceModule: LEDGER_MODULE, title: { in: all.map((item) => item.stub.key) } }, select: { id: true, title: true, metadata: true } });
  const known = new Map(ledger.map((row) => [row.title, { id: row.id, attempts: (JSON.parse(row.metadata) as { attempts?: number; result?: string }).attempts ?? 1, result: (JSON.parse(row.metadata) as { result?: string }).result }]));
  const perSource = new Map<string, number>();
  for (const item of all) {
    const seen = known.get(item.stub.key);
    if (seen && (seen.result !== 'error' || seen.attempts >= MAX_ATTEMPTS)) continue;
    const count = perSource.get(item.stub.sourceId) ?? 0;
    if (count >= item.max) continue;
    perSource.set(item.stub.sourceId, count + 1);
    picked.push(item);
    report.sources[item.stub.sourceId].fresh++;
  }

  // 3) titles already on the board (cross-source duplicates, e.g. 잇지제주 re-posting 제주TP)
  const recent = await db.artifact.findMany({ where: { sourceModule: EVENT_MODULE, type: 'text', status: 'published', createdAt: { gte: new Date(Date.now() - 120 * 86400_000) } }, select: { title: true } });
  const titles = new Set(recent.map((row) => norm(row.title)));

  const remember = async (stub: Stub, result: string, extra: Record<string, unknown> = {}) => {
    if (dryRun) return;
    const prior = known.get(stub.key);
    const metadata = JSON.stringify({ result, attempts: result === 'error' ? (prior?.attempts ?? 0) + 1 : 1, url: stub.url, source: stub.sourceId, at: new Date().toISOString(), ...extra });
    if (prior) await db.artifact.update({ where: { id: prior.id }, data: { metadata } });
    else await db.artifact.create({ data: { ownerId: owner, type: 'text', sourceModule: LEDGER_MODULE, title: stub.key, status: 'hidden', visibility: 'unlisted', metadata } });
  };

  // 4) read → rewrite → publish
  for (const { stub } of picked) {
    const row = (result: ItemResult['result'], extra: Partial<ItemResult> = {}) => report.items.push({ source: stub.sourceId, title: stub.title, url: stub.url, result, ...extra });
    if (SKIP_TITLE.test(stub.title)) { await remember(stub, 'irrelevant', { detail: 'title filter' }); row('irrelevant', { detail: 'title filter' }); continue; }
    if (report.aiCalls >= maxAi) { row('blocked', { detail: 'daily AI cap' }); continue; }
    try {
      let html = '', text = stub.snippet ?? '';
      if (await robotsAllowed(stub.url)) {
        try { html = decodeBody(await fetchLimited(stub.url)); text = pageText(html) || text; await sleep(800); } catch (error) { if (!text) throw error; }
      } else if (!text) { await remember(stub, 'blocked'); row('blocked', { detail: 'robots.txt' }); continue; }
      if (text.length < 60) { await remember(stub, 'invalid', { detail: 'empty page' }); row('invalid', { detail: 'empty page' }); continue; }

      report.aiCalls++;
      const extracted = await extractEvent({ sourceName: stub.sourceName, title: stub.title, url: stub.url, text });
      if (!extracted.ok) { await remember(stub, extracted.reason, { detail: extracted.detail }); row(extracted.reason, { detail: extracted.detail }); continue; }
      const { input } = extracted;
      if (titles.has(norm(input.title))) { await remember(stub, 'duplicate'); row('duplicate', { detail: input.title }); continue; }

      const poster = await pickPoster([...(stub.imageUrl ? [stub.imageUrl] : []), ...posterCandidates(html, stub.url)]);
      if (dryRun) { row('preview', { poster: Boolean(poster), preview: { ...input, posterFrom: poster?.sourceUrl } }); continue; }

      const upload = poster ? await uploadPoster(poster.buffer, owner) : null;
      const data = eventData(input, upload?.url ?? null);
      await db.artifact.create({
        data: { ownerId: owner, type: 'text', sourceModule: EVENT_MODULE, status: 'published', visibility: 'unlisted', ...data,
          metadata: JSON.stringify({ ...JSON.parse(data.metadata), ingest: { source: stub.sourceId, key: stub.key, url: stub.url, posterFrom: poster?.sourceUrl ?? null, at: new Date().toISOString() } }) },
      });
      titles.add(norm(input.title));
      await remember(stub, 'published');
      report.published++;
      row('published', { poster: Boolean(poster) });
    } catch (error) {
      if (error instanceof AiUnavailableError) { report.aborted = error.message; row('blocked', { detail: error.message }); break; }
      const detail = (error as Error).message.slice(0, 160);
      await remember(stub, 'error', { detail }).catch(() => undefined);
      row('error', { detail });
    }
  }
  return report;
}
