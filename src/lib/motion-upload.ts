import { z } from 'zod';
export const motionCategories = ['Idle', 'Walk', 'Run', 'Jump', 'Attack', 'Hit', 'Death', 'Dance', 'Other'] as const;
export const motionUploadSchema = z.object({
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().min(1).max(180).regex(/\.fbx$/i),
  size: z.number().int().min(24).max(28_000_000),
  category: z.enum(motionCategories),
});
export function looksLikeFbx(bytes: Uint8Array) {
  const header = new TextDecoder().decode(bytes.slice(0, 256));
  return header.startsWith('Kaydara FBX Binary  \0\x1a\0') || /^\s*;\s*FBX\s+\d/i.test(header);
}
