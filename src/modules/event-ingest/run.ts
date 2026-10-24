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
import type { EventInput } from '@/modules/ai-events/input';

export const LEDGER_MODULE = 'event-ingest';
const MAX_ATTEMPTS = 3;

export type RunOptions = { dryRun?: boolean; sources?: string[]; maxAi?: number };
export type ItemResult = { source: string; title: string; url: string; result: 'published' | 'irrelevant' | 'ended' | 'invalid' | 'duplicate' | 'blocked' | 'error' | 'preview'; detail?: string; poster?: boolean; preview?: unknown };
export type RunReport = { dryRun: boolean; sources: Record<string, { found: number; fresh: number; error?: string }>; aiCalls: number; published: number; aborted?: string; items: ItemResult[] };

// Titles that are never an event/course/contest — skipped before any page fetch or AI call.
const SKIP_TITLE = /채용|스태프|알바|입찰|용역|낙찰|사칭|휴관|업무협약|MOU|주거래금고|개인정보|안전 ?점검|휴무/i;
export const TITLE_ONLY = '(상세 본문을 읽지 못했습니다. 제목에 적힌 정보만 사용하고, 제목에 없는 일정·장소·비용·대상은 비워 두세요.)';
const norm = (title: string) => title.toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
const normOrg = (name = '') => norm(name.replace(/재단법인|사단법인|주식회사|\(재\)|\(사\)|\(주\)/g, ''));
const normUrl = (url = '') => { try { const u = new URL(url); return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') + u.search; } catch { return ''; } };

type Seen = { title: string; organizer?: string; applyUntil?: string; sourceUrl?: string };
/** Same event posted by the organizer and re-posted by an aggregator: same link, same/contained title, or same organizer + deadline. */
function sameEvent(a: Seen, b: Seen) {
  if (a.sourceUrl && normUrl(a.sourceUrl) === normUrl(b.sourceUrl)) return true;
  const [x, y] = [norm(a.title), norm(b.title)];
  if (x === y || (Math.min(x.length, y.length) >= 8 && (x.includes(y) || y.includes(x)))) return true;
  return Boolean(a.applyUntil && a.applyUntil === b.applyUntil && normOrg(a.organizer) && normOrg(a.organizer) === normOrg(b.organizer));
}

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

  // 3) what is already on the board (cross-source duplicates, e.g. 잇지제주 re-posting 제주콘진원 notices)
  const recent = await db.artifact.findMany({ where: { sourceModule: EVENT_MODULE, type: 'text', status: 'published', createdAt: { gte: new Date(Date.now() - 120 * 86400_000) } }, select: { title: true, metadata: true } });
  const seen = recent.map((row) => { const e = (JSON.parse(row.metadata) as { aiEvent?: Partial<EventInput> }).aiEvent ?? {}; return { title: row.title, organizer: e.organizer, applyUntil: e.applyUntil, sourceUrl: e.sourceUrl }; });

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
      let html = '', text = stub.snippet ?? '', titleOnly = false;
      if (await robotsAllowed(stub.url)) {
        try { html = decodeBody(await fetchLimited(stub.url)); text = pageText(html) || text; await sleep(800); }
        // Some sites (잇지제주) refuse cloud-server IPs on detail pages. The list entry still has a title (with dates) and a poster thumbnail.
        catch (error) { if (!text && !stub.imageUrl) throw error; titleOnly = !text; text ||= TITLE_ONLY; }
      } else if (!text) { await remember(stub, 'blocked'); row('blocked', { detail: 'robots.txt' }); continue; }
      if (text.length < 60 && !titleOnly) { await remember(stub, 'invalid', { detail: 'empty page' }); row('invalid', { detail: 'empty page' }); continue; }

      report.aiCalls++;
      const extracted = await extractEvent({ sourceName: stub.sourceName, title: stub.title, url: stub.url, text });
      if (!extracted.ok) { await remember(stub, extracted.reason, { detail: extracted.detail }); row(extracted.reason, { detail: extracted.detail }); continue; }
      const { input } = extracted;
      if (seen.some((other) => sameEvent(input, other))) { await remember(stub, 'duplicate'); row('duplicate', { detail: input.title }); continue; }

      const poster = await pickPoster([...(stub.imageUrl ? [stub.imageUrl] : []), ...posterCandidates(html, stub.url)]);
      if (dryRun) { row('preview', { poster: Boolean(poster), preview: { ...input, posterFrom: poster?.sourceUrl } }); continue; }

      const upload = poster ? await uploadPoster(poster.buffer, owner) : null;
      const data = eventData(input, upload?.url ?? null);
      await db.artifact.create({
        data: { ownerId: owner, type: 'text', sourceModule: EVENT_MODULE, status: 'published', visibility: 'unlisted', ...data,
          metadata: JSON.stringify({ ...JSON.parse(data.metadata), ingest: { source: stub.sourceId, key: stub.key, url: stub.url, posterFrom: poster?.sourceUrl ?? null, at: new Date().toISOString() } }) },
      });
      seen.push({ title: input.title, organizer: input.organizer, applyUntil: input.applyUntil, sourceUrl: input.sourceUrl });
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
