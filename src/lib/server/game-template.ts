// Space-shooter game template filler for pipeline-game runner
import fs from 'fs';
import path from 'path';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
}

/** Read the template and replace {{TITLE}} / {{PALETTE}} / {{SPEED}} placeholders. */
export function renderGameHtml(title: string, palette: string, speed: number): string {
  const tplPath = path.join(process.cwd(), 'public', 'games', 'space-shooter.template.html');
  const tpl = fs.readFileSync(tplPath, 'utf-8');
  return tpl
    .replace(/\{\{TITLE\}\}/g, escapeHtml(title))
    .replace(/\{\{PALETTE\}\}/g, palette)
    .replace(/\{\{SPEED\}\}/g, String(Math.round(speed)));
}

/** Write game html under public/uploads/games/{runId}/index.html, return contentUrl. */
export function writeGameBundle(runId: string, html: string): string {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'games', runId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
  return `/uploads/games/${runId}/index.html`;
}

/** Cover thumbnail for generated games (falls back to an existing seed image). */
export function gameCoverUrl(): string {
  const preferred = path.join(process.cwd(), 'public', 'uploads', 'seed', 'thumb-space-shooter.png');
  if (fs.existsSync(preferred)) return '/uploads/seed/thumb-space-shooter.png';
  return '/uploads/seed/thumb-cyberpunk.png';
}
