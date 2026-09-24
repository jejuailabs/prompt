export type VideoUpscaleTier = 'hd' | 'fhd';

export interface VideoUpscaleTarget {
  tier: VideoUpscaleTier;
  width: number;
  height: number;
  label: string;
  description: string;
}

/**
 * These are final pixel sizes, never a blind x2 multiplier. H3's current
 * 480×832 portrait output therefore lands on the conventional 720×1280 then
 * 1080×1920 delivery sizes without changing its aspect ratio.
 */
export function getVideoUpscaleTarget(aspect: string, tier: VideoUpscaleTier): VideoUpscaleTarget {
  if (aspect === '16:9') return tier === 'hd'
    ? { tier, width: 1280, height: 720, label: 'HD 1단계', description: '1280 × 720 · 빠른 고화질' }
    : { tier, width: 1920, height: 1080, label: 'FHD 2단계', description: '1920 × 1080 · 최고 해상도' };
  if (aspect === '1:1') return tier === 'hd'
    ? { tier, width: 720, height: 720, label: 'HD 1단계', description: '720 × 720 · 빠른 고화질' }
    : { tier, width: 1080, height: 1080, label: 'FHD 2단계', description: '1080 × 1080 · 최고 해상도' };
  return tier === 'hd'
    ? { tier, width: 720, height: 1280, label: 'HD 1단계', description: '720 × 1280 · 빠른 고화질' }
    : { tier, width: 1080, height: 1920, label: 'FHD 2단계', description: '1080 × 1920 · 최고 해상도' };
}

export function isVideoUpscaleTier(value: unknown): value is VideoUpscaleTier {
  return value === 'hd' || value === 'fhd';
}

export function getVideoUpscaleCredit(tier: VideoUpscaleTier) {
  return tier === 'fhd' ? 70 : 45;
}

/** Only PLAYLAB's immutable public upload objects may be delegated to a worker. */
export function isPlaylabVideoUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!origin) return false;
  try {
    const url = new URL(value);
    const supabase = new URL(origin);
    return url.protocol === 'https:' && url.origin === supabase.origin
      && url.pathname.startsWith('/storage/v1/object/public/uploads/')
      && /\.(mp4|webm|mov)$/i.test(url.pathname);
  } catch {
    return false;
  }
}
