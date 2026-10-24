// Source adapters: each returns "stubs" (a link + title + optional image/snippet). Detail pages are read later.
import { createHash } from 'node:crypto';
import { decodeBody, fetchLimited, robotsAllowed } from './net';
import { linksFrom, resolveUrl, stripTags, unescapeHtml } from './html';
import type { SourceDef } from './sources';

export type Stub = { key: string; sourceId: string; sourceName: string; url: string; title: string; imageUrl?: string; snippet?: string };

const WEEK = 7 * 86400_000;
export const keyOf = (url: string) => createHash('sha1').update(canonical(url)).digest('hex').slice(0, 24);
function canonical(url: string) {
  try { const u = new URL(url); u.hash = ''; u.hostname = u.hostname.replace(/^www\./, ''); return u.toString().replace(/\/$/, ''); } catch { return url; }
}
const stub = (source: SourceDef, url: string, title: string, extra: Partial<Stub> = {}): Stub => ({ key: keyOf(url), sourceId: source.id, sourceName: source.name, url, title: title.slice(0, 200), ...extra });
const tag = (xml: string, name: string) => { const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(xml); return m ? unescapeHtml(m[1]).trim() : ''; };

async function getText(url: string) {
  if (!(await robotsAllowed(url))) throw new Error('robots.txt disallows ' + url);
  return decodeBody(await fetchLimited(url));
}

async function rssStubs(source: Extract<SourceDef, { type: 'rss' }>): Promise<Stub[]> {
  const xml = await getText(source.url);
  const out: Stub[] = [];
  for (const item of xml.match(/<item>[\s\S]*?<\/item>/gi) ?? []) {
    const url = resolveUrl(tag(item, 'link'), source.url);
    if (!url || !source.allow.test(new URL(url).pathname + '/')) continue;
    const published = Date.parse(tag(item, 'pubDate'));
    if (Number.isFinite(published) && Date.now() - published > 30 * 86400_000) continue;
    const image = /<media:content[^>]+url=["']([^"']+)["']/i.exec(item)?.[1];
    out.push(stub(source, url, tag(item, 'title'), { imageUrl: image ? resolveUrl(image, url) ?? undefined : undefined, snippet: stripTags(tag(item, 'description')) }));
  }
  return out;
}

async function boardStubs(source: Extract<SourceDef, { type: 'board' }>): Promise<Stub[]> {
  const out = new Map<string, Stub>();
  for (const list of source.lists) {
    try {
      const html = await getText(list);
      for (const link of linksFrom(html, list, source.link)) out.set(link.url, stub(source, link.url, link.title));
    } catch (error) { console.warn(`[event-ingest] ${source.id} list failed (${list}):`, (error as Error).message); }
  }
  return [...out.values()];
}

async function naverStubs(source: Extract<SourceDef, { type: 'naver' }>): Promise<Stub[]> {
  const id = process.env.NAVER_CLIENT_ID, secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) return [];
  const out = new Map<string, Stub>();
  for (const query of source.queries) {
    const res = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=10&sort=date`, { headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) { console.warn('[event-ingest] naver', query, res.status); continue; }
    const data = await res.json() as { items?: { title: string; originallink?: string; link: string; description: string; pubDate: string }[] };
    for (const item of data.items ?? []) {
      if (Date.now() - Date.parse(item.pubDate) > WEEK) continue;
      const url = resolveUrl(item.originallink || item.link, 'https://news.naver.com');
      if (url && url.startsWith('https://')) out.set(url, stub(source, url, stripTags(item.title), { snippet: stripTags(item.description) }));
    }
  }
  return [...out.values()];
}

// Open-data announcement APIs. Field names differ between deployments, so read the usual candidates.
const pick = (row: Record<string, unknown>, keys: string[]) => { for (const key of keys) { const v = row[key]; if (typeof v === 'string' && v.trim()) return v.trim(); } return ''; };
const rowsOf = (data: unknown): Record<string, unknown>[] => {
  const found: Record<string, unknown>[] = [];
  const walk = (value: unknown) => { if (Array.isArray(value)) value.forEach((v) => (v && typeof v === 'object' && !Array.isArray(v) ? found.push(v as Record<string, unknown>) : walk(v))); else if (value && typeof value === 'object') Object.values(value).forEach(walk); };
  walk(data); return found;
};

async function kstartupStubs(source: Extract<SourceDef, { type: 'kstartup' }>): Promise<Stub[]> {
  const key = process.env.DATA_GO_KR_KEY; if (!key) return [];
  const res = await fetch(`https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01?serviceKey=${encodeURIComponent(key)}&page=1&perPage=40&returnType=json`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error('K-Startup HTTP ' + res.status);
  return rowsOf(await res.json()).flatMap((row) => {
    const title = pick(row, ['biz_pbanc_nm', 'intg_pbanc_biz_nm', 'title']), url = resolveUrl(pick(row, ['detl_pg_url', 'url']), 'https://www.k-startup.go.kr');
    const open = pick(row, ['rcrt_prgs_yn']); // 'Y' while recruiting
    return title && url && open !== 'N' ? [stub(source, url, title, { snippet: [pick(row, ['supt_regin']), pick(row, ['aply_trgt_ctnt']), pick(row, ['pbanc_ctnt'])].join(' ').slice(0, 1500) })] : [];
  });
}

async function bizinfoStubs(source: Extract<SourceDef, { type: 'bizinfo' }>): Promise<Stub[]> {
  const key = process.env.BIZINFO_KEY; if (!key) return [];
  const res = await fetch(`https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=${encodeURIComponent(key)}&dataType=json&searchCnt=60&hashtags=${encodeURIComponent('제주')}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error('bizinfo HTTP ' + res.status);
  return rowsOf(await res.json()).flatMap((row) => {
    const title = pick(row, ['pblancNm']), url = resolveUrl(pick(row, ['pblancUrl', 'link']), 'https://www.bizinfo.go.kr');
    return title && url ? [stub(source, url, title, { snippet: [pick(row, ['jrsdInsttNm']), pick(row, ['reqstBeginEndDe']), pick(row, ['bsnsSumryCn'])].join(' ').slice(0, 1500) })] : [];
  });
}

export async function collectStubs(source: SourceDef): Promise<Stub[]> {
  switch (source.type) {
    case 'rss': return rssStubs(source);
    case 'board': return boardStubs(source);
    case 'naver': return naverStubs(source);
    case 'kstartup': return kstartupStubs(source);
    case 'bizinfo': return bizinfoStubs(source);
  }
}
