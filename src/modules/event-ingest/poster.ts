// Poster step: reuse the organizer's own poster when the notice has one (re-encoded, metadata stripped).
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { uploadBuffer } from '@/lib/server/storage';
import { fetchLimited, robotsAllowed } from './net';

const MAX_BYTES = 6 * 1024 * 1024;

/** First candidate that decodes as a real, reasonably large poster-like image. */
export async function pickPoster(candidates: string[]): Promise<{ buffer: Buffer; sourceUrl: string } | null> {
  for (const url of candidates) {
    try {
      if (!(await robotsAllowed(url))) continue;
      const body = await fetchLimited(url, { maxBytes: MAX_BYTES, timeoutMs: 20_000 });
      if (!/^image\/(png|jpe?g|webp)/i.test(body.type)) continue;
      const image = sharp(body.buf, { limitInputPixels: 40_000_000, animated: false });
      const info = await image.metadata();
      const width = info.width ?? 0, height = info.height ?? 0;
      if (width < 400 || height < 400 || width / height > 3 || height / width > 3 || (info.pages ?? 1) > 1) continue;
      const buffer = await image.rotate().resize({ width: 1800, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
      return { buffer, sourceUrl: url };
    } catch { /* try the next candidate */ }
  }
  return null;
}

export async function uploadPoster(buffer: Buffer, ownerId: string) {
  const path = 'ai-events/' + ownerId + '/' + randomUUID() + '.webp';
  return { path, url: await uploadBuffer(path, buffer, 'image/webp') };
}
