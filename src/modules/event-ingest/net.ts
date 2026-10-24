// Polite, SSRF-safe fetching for the daily AI 일정 collector (server only).
import dns from 'node:dns/promises';
import net from 'node:net';

export const BOT_NAME = 'COAIBot';
const UA = `Mozilla/5.0 (compatible; ${BOT_NAME}/1.0; +https://coai.kr)`;

function privateAddress(ip: string) {
  if (net.isIPv6(ip)) return /^(::1?$|f[cd]|fe[89ab]|::ffff:(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.))/i.test(ip);
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error('blocked url');
  const addresses = net.isIP(url.hostname) ? [{ address: url.hostname }] : await dns.lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((item) => privateAddress(item.address))) throw new Error('blocked host');
  return url;
}

export type Fetched = { buf: Buffer; type: string; url: string };

/** GET with a size cap, a timeout and manual redirects (every hop is re-checked). */
export async function fetchLimited(raw: string, opts: { maxBytes?: number; timeoutMs?: number; headers?: Record<string, string> } = {}): Promise<Fetched> {
  const maxBytes = opts.maxBytes ?? 2_000_000;
  let current = raw;
  for (let hop = 0; hop < 4; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
      headers: { 'user-agent': UA, accept: '*/*', 'accept-language': 'ko,en;q=0.8', ...opts.headers },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { current = new URL(res.headers.get('location')!, url).toString(); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const length = Number(res.headers.get('content-length') ?? 0);
    if (length > maxBytes) throw new Error('too large');
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length;
      if (size > maxBytes) throw new Error('too large');
      chunks.push(Buffer.from(chunk));
    }
    return { buf: Buffer.concat(chunks), type: res.headers.get('content-type') ?? '', url: url.toString() };
  }
  throw new Error('too many redirects');
}

export function decodeBody(body: Fetched): string {
  const head = body.buf.subarray(0, 4096).toString('latin1');
  const charset = /charset=["']?([\w-]+)/i.exec(body.type)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'utf-8';
  try { return new TextDecoder(charset.toLowerCase()).decode(body.buf); } catch { return body.buf.toString('utf8'); }
}

// --- robots.txt: we only read pages the site allows for us (or for every bot) -------------
type Rule = { allow: boolean; pattern: RegExp; length: number };
const robotsCache = new Map<string, Rule[]>();

function parseRobots(text: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null; let lastWasAgent = false;
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([\w-]+)\s*:\s*(.*?)\s*(?:#.*)?$/.exec(line);
    if (!match) continue;
    const field = match[1].toLowerCase(), value = match[2];
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase()); lastWasAgent = true; continue;
    }
    lastWasAgent = false;
    if (!current || (field !== 'allow' && field !== 'disallow') || !value) continue;
    const source = value.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$');
    current.rules.push({ allow: field === 'allow', pattern: new RegExp('^' + source), length: value.length });
  }
  const own = groups.filter((group) => group.agents.some((agent) => agent !== '*' && BOT_NAME.toLowerCase().includes(agent)));
  return (own.length ? own : groups.filter((group) => group.agents.includes('*'))).flatMap((group) => group.rules);
}

export async function robotsAllowed(raw: string): Promise<boolean> {
  const url = new URL(raw);
  let rules = robotsCache.get(url.origin);
  if (!rules) {
    try { rules = parseRobots(decodeBody(await fetchLimited(url.origin + '/robots.txt', { maxBytes: 200_000, timeoutMs: 8000 }))); }
    catch { rules = []; }
    robotsCache.set(url.origin, rules);
  }
  const target = url.pathname + url.search;
  const hit = rules.filter((rule) => rule.pattern.test(target)).sort((a, b) => b.length - a.length || Number(b.allow) - Number(a.allow))[0];
  return !hit || hit.allow;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
