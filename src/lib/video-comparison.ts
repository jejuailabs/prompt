import type { H3Preset } from './h3-presets';

export const COMPARISON_MODELS = [
  { engine: 'h3', label: 'H3 INT8', steps: '관리자 선택', frames: 158 },
  { engine: 'ltx', label: 'LTX-Video 2B 0.9.6 distilled', steps: '8', frames: 145 },
  { engine: 'wan', label: 'Wan 2.2 TI2V 5B', steps: '20', frames: 145 },
] as const;
export type ComparisonEngine = typeof COMPARISON_MODELS[number]['engine'];
export const comparisonTerminal = (status: string) => ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(status);
export interface ComparisonInfo {
  batchId: string;
  compiledPrompt: string;
  preset: H3Preset;
  seed: number;
  createdAt: string;
  environment: { gpu: string[]; image: string; optimized: boolean };
}
export interface ComparisonRow {
  projectId: string;
  engine: ComparisonEngine;
  comparison: ComparisonInfo;
  status: string;
  videoUrl?: string;
  executionTime?: number;
  delayTime?: number;
  error?: string;
}
