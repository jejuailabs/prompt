export const H3_PRESETS = {
  turbo8: { label: '터보 8스텝', steps: 8, turbo: true },
  standard20: { label: '일반 20스텝', steps: 20, turbo: false },
  standard30: { label: '일반 30스텝', steps: 30, turbo: false },
} as const;
export type H3Preset = keyof typeof H3_PRESETS;
export const isH3Preset = (value: unknown): value is H3Preset => typeof value === 'string' && Object.hasOwn(H3_PRESETS, value);
export function h3Size(aspect: string, preview = false) {
  // Preview halves total pixels, not both dimensions (which would quarter them).
  const landscape = preview ? { width: 576, height: 320 } : { width: 832, height: 480 };
  return aspect === '1:1' ? { width: preview ? 448 : 640, height: preview ? 448 : 640 }
    : aspect === '9:16' ? { width: landscape.height, height: landscape.width } : landscape;
}
