import { db } from '@/lib/db';
import { isH3Preset, type H3Preset } from '@/lib/h3-presets';
export const H3_CONFIG_KEY = 'h3-presets-v1';
export interface H3Config { speed: H3Preset; quality: H3Preset; gpu: '5090' | 'blackwell'; revision: string }
export const DEFAULT_H3_CONFIG: H3Config = { speed: 'turbo8', quality: 'standard20', gpu: '5090', revision: 'default-v1' };
export async function getH3Config(): Promise<H3Config> {
  const row = await db.setting.findUnique({ where: { key: H3_CONFIG_KEY } });
  if (!row) return DEFAULT_H3_CONFIG;
  const value = JSON.parse(row.value);
  if (!isH3Preset(value.speed) || !isH3Preset(value.quality) || !['5090', 'blackwell'].includes(value.gpu)) throw new Error('H3 설정이 올바르지 않습니다');
  return value;
}
