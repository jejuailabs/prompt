// Tiny HTML helpers — enough to pull links, readable text and poster candidates from notice pages.
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', hellip: '…', ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'", ndash: '–', mdash: '—' };

export function unescapeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, code: string) => {
      if (code[0] === '#') { const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : all; }
      return ENTITIES[code.toLowerCase()] ?? all;
    });
}

export function stripTags(html: string) {
  return unescapeHtml(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function pageText(html: string, max = 6000) {
  const body = /<body[\s\S]*<\/body>/i.exec(html)?.[0] ?? html;
  const cleaned = body.replace(/<(script|style|noscript|nav|header|footer|aside|form|select)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d)[^>]*>/gi, '\n');
  return unescapeHtml(cleaned.replace(/<[^>]+>/g, ' ')).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim().slice(0, max);
}

export function resolveUrl(href: string, base: string) {
  try { const url = new URL(unescapeHtml(href.trim()), base); url.hash = ''; return /^https?:$/.test(url.protocol) ? url.toString() : null; } catch { return null; }
}

export function linksFrom(html: string, base: string, pattern: RegExp) {
  const found = new Map<string, string>();
  for (const match of html.matchAll(/<a\b[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = resolveUrl(match[1], base);
    if (!url || !pattern.test(new URL(url).pathname + new URL(url).search)) continue;
    const text = stripTags(match[2]);
    if (!found.has(url) || (text.length > (found.get(url) ?? '').length)) found.set(url, text);
  }
  return [...found].map(([url, title]) => ({ url, title }));
}

const SKIP_IMAGE = /logo|icon|btn|button|blank|spacer|sns|banner|profile|avatar|common|sprite|loading|emoji|bullet|\.svg|\.gif|ogimage|favicon|qr/i;
const LIKELY_POSTER = /editor|upload|files?\/|attach|board|data\/|cdn|poster|thumb/i;

export function posterCandidates(html: string, base: string) {
  const body = /<body[\s\S]*<\/body>/i.exec(html)?.[0] ?? html;
  const inBody = [...body.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi)].map((match) => resolveUrl(match[1], base)).filter((url): url is string => Boolean(url));
  const meta = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html) ?? /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
  const og = meta ? resolveUrl(meta[1], base) : null;
  const ranked = inBody.filter((url) => !SKIP_IMAGE.test(url)).sort((a, b) => Number(LIKELY_POSTER.test(b)) - Number(LIKELY_POSTER.test(a)));
  const list = [...ranked, ...(og && !SKIP_IMAGE.test(og) ? [og] : [])];
  return [...new Set(list)].slice(0, 4);
}
