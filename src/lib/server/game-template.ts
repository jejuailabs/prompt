// Space-shooter game template filler for pipeline-game runner
import fs from 'fs';
import path from 'path';
import { uploadBuffer } from '@/lib/server/storage';

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

/** Upload game HTML to blob storage, return public URL. */
export async function writeGameBundle(runId: string, html: string): Promise<string> {
  return uploadBuffer(`games/${runId}/index.html`, Buffer.from(html, 'utf-8'), 'text/html');
}

/** Cover thumbnail for generated games (static seed image). */
export function gameCoverUrl(): string {
  return '/uploads/seed/thumb-space-shooter.png';
}
