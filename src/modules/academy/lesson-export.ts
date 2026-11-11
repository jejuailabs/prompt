// Lecture-note export helpers: share ("퍼가기") as rich HTML / Markdown and
// save as PDF through the browser's print engine (vector text, Korean fonts
// work without embedding a font file).
import { timestampSeconds } from '@/modules/academy/curriculum';

export type LectureExport = {
  title: string;
  channel?: string;
  videoId: string;
  summary?: string;
  keywords?: string[];
  notes: string;
  /** Page link so readers can come back to the lesson. */
  pageUrl: string;
};

const TIMESTAMP = /\[(\d{1,3}:\d{2}(?::\d{2})?)\](?!\()/g;

export const youtubeAt = (videoId: string, seconds: number) => `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;

/** `[03:12]` → `[▶ 03:12](youtube…&t=192s)` so timestamps work inside and outside the site. */
export function linkTimestamps(markdown: string, videoId: string) {
  return markdown.replace(TIMESTAMP, (whole, time: string) => {
    const seconds = timestampSeconds(time);
    return seconds === null ? whole : `[▶ ${time}](${youtubeAt(videoId, seconds)})`;
  });
}

/** Seconds from a link made by linkTimestamps for this video, otherwise null. */
export function timestampFromHref(href: string | undefined, videoId: string): number | null {
  if (!href) return null;
  try {
    const url = new URL(href);
    if (!/(^|\.)youtube\.com$/.test(url.hostname) || url.searchParams.get('v') !== videoId) return null;
    const t = url.searchParams.get('t')?.replace(/s$/, '');
    return t && /^\d+$/.test(t) ? Number(t) : null;
  } catch { return null; }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function headerHtml(x: LectureExport) {
  const source = `https://www.youtube.com/watch?v=${x.videoId}`;
  return `<h1>${escapeHtml(x.title)}</h1>
<p class="meta">${x.channel ? `${escapeHtml(x.channel)} · ` : ''}원본 영상: <a href="${source}">${source}</a></p>
${x.summary ? `<div class="summary"><strong>한눈에 보기</strong><p>${escapeHtml(x.summary)}</p>${x.keywords?.length ? `<p class="keywords">${x.keywords.map(k => `#${escapeHtml(k)}`).join(' ')}</p>` : ''}</div>` : ''}`;
}

function footerHtml(x: LectureExport) {
  return `<hr><p class="meta">출처: COAI 강의 노트 · <a href="${escapeHtml(x.pageUrl)}">${escapeHtml(x.pageUrl)}</a></p>`;
}

/** HTML fragment for pasting into blogs/notes; `notesHtml` is the rendered markdown. */
export function shareHtml(x: LectureExport, notesHtml: string) {
  return `${headerHtml(x)}${notesHtml}${footerHtml(x)}`;
}

export function shareMarkdown(x: LectureExport) {
  const source = `https://www.youtube.com/watch?v=${x.videoId}`;
  return [
    `# ${x.title}`,
    `${x.channel ? `${x.channel} · ` : ''}원본 영상: ${source}`,
    x.summary ? `> **한눈에 보기** ${x.summary}` : '',
    x.keywords?.length ? x.keywords.map(k => `#${k}`).join(' ') : '',
    linkTimestamps(x.notes, x.videoId),
    '---',
    `출처: COAI 강의 노트 · ${x.pageUrl}`,
  ].filter(Boolean).join('\n\n');
}

/** Copies rich HTML with a Markdown/plain fallback. Returns false when the clipboard is blocked. */
export async function copyRich(html: string, plain: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })]);
      return true;
    }
    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    try { await navigator.clipboard.writeText(plain); return true; } catch { return false; }
  }
}

const PRINT_CSS = `
@page{size:A4;margin:18mm 16mm}
*{box-sizing:border-box}
body{font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;color:#1d1d1f;font-size:11pt;line-height:1.75;margin:0;word-break:keep-all;overflow-wrap:anywhere}
h1{font-size:20pt;line-height:1.35;margin:0 0 6pt;letter-spacing:-.02em}
h2{font-size:14pt;margin:20pt 0 6pt;padding-bottom:4pt;border-bottom:1px solid #ddd;break-after:avoid}
h3{font-size:12pt;margin:14pt 0 4pt;break-after:avoid}
p{margin:5pt 0}ul,ol{padding-left:18pt;margin:6pt 0}li{margin:2pt 0}
a{color:#0b63c5;text-decoration:none}
blockquote{margin:8pt 0;padding:6pt 10pt;border-left:3px solid #ff7a3d;background:#fff6f0;break-inside:avoid}
code{font-family:ui-monospace,Consolas,monospace;font-size:9.5pt;background:#f2f2f2;padding:0 3px}
pre{background:#f5f5f5;padding:8pt;white-space:pre-wrap;break-inside:avoid}
.meta{color:#666;font-size:9pt}
.summary{border-left:3px solid #2f6fdd;background:#f3f7ff;padding:8pt 12pt;margin:12pt 0 16pt;break-inside:avoid}
.summary strong{font-size:10pt;color:#2f6fdd}
.keywords{color:#2f6fdd;font-size:9pt}
hr{border:0;border-top:1px solid #ddd;margin:20pt 0 8pt}
img{max-width:100%}`;

/**
 * Opens the print dialog for the lecture note in a hidden frame. The document
 * title becomes the suggested PDF file name ("PDF로 저장").
 */
export function printLecturePdf(x: LectureExport, notesHtml: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) { frame.remove(); return false; }
  const fileTitle = `${x.title} - 강의노트`.replace(/[<>:"/\\|?*]/g, '_');
  doc.open();
  doc.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(fileTitle)}</title><style>${PRINT_CSS}</style></head><body>${headerHtml(x)}${notesHtml}${footerHtml(x)}</body></html>`);
  doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  win.addEventListener('afterprint', cleanup, { once: true });
  // Let fonts/layout settle before printing.
  setTimeout(() => {
    const parentTitle = document.title;
    document.title = fileTitle; // some browsers name the PDF after the top document
    try { win.focus(); win.print(); } finally { document.title = parentTitle; }
    setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  }, 300);
  return true;
}
