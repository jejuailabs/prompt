import { geminiTts } from './gemini';
import { qwenRunpodTts } from './qwen-runpod';
import type { TtsProvider, TtsProviderId } from './types';

export * from './types';

const PROVIDERS: Record<TtsProviderId, TtsProvider> = { qwen: qwenRunpodTts, gemini: geminiTts };

/** Active TTS engine. Defaults to the self-hosted RunPod Qwen3-TTS worker. */
export function activeTtsProvider(): TtsProvider {
  return process.env.TTS_PROVIDER === 'gemini' ? geminiTts : qwenRunpodTts;
}

export function ttsProvider(id: string | undefined): TtsProvider | null {
  return id && id in PROVIDERS ? PROVIDERS[id as TtsProviderId] : null;
}
