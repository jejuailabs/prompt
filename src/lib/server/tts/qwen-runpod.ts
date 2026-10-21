import { cancelRunpodJob, getRunpodJobStatus, queueRunpodJob } from '@/lib/server/runpod';
import { TtsProviderError, type TtsProvider } from './types';

const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;
const FAILED = new Set(['FAILED', 'CANCELLED', 'TIMED_OUT']);

function wavFrom(output: unknown) {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return null;
  const encoded = (output as Record<string, unknown>).audio_base64;
  if (typeof encoded !== 'string' || !encoded || encoded.length > MAX_OUTPUT_BYTES * 1.4) return null;
  const bytes = Buffer.from(encoded, 'base64');
  return bytes.length > 0 && bytes.length <= MAX_OUTPUT_BYTES ? bytes : null;
}

/** Qwen3-TTS 1.7B on the shared PLAYLAB RunPod worker: CustomVoice ("tts") or VoiceDesign ("design"). */
export const qwenRunpodTts: TtsProvider = {
  id: 'qwen',
  model: 'Qwen3-TTS-12Hz-1.7B (CustomVoice/VoiceDesign)',
  async start(request) {
    try {
      const job = await queueRunpodJob('qwen3_tts', {
        mode: request.mode, text: request.text, language: request.language,
        ...(request.mode === 'tts' ? { speaker: request.voice } : {}),
        ...(request.instruct ? { instruct: request.instruct } : {}),
      });
      return { kind: 'queued', jobId: job.id };
    } catch {
      console.error('[tts/qwen] RunPod queue request failed');
      throw new TtsProviderError('지금은 AI 음성 서비스를 점검 중이에요. 잠시 후 다시 시도해 주세요.', 503);
    }
  },
  async check(jobId) {
    const job = await getRunpodJobStatus('qwen3_tts', jobId);
    if (job.status === 'COMPLETED') {
      const wav = wavFrom(job.output);
      if (wav) return { status: 'done', wav, executionTimeMs: job.executionTime };
      console.error('[tts/qwen] completed job returned no playable WAV');
      return { status: 'failed', providerStatus: 'FAILED', executionTimeMs: job.executionTime };
    }
    if (FAILED.has(job.status)) {
      console.error(`[tts/qwen] job ended with status ${job.status}`);
      return { status: 'failed', providerStatus: job.status, executionTimeMs: job.executionTime };
    }
    return { status: 'pending', providerStatus: job.status };
  },
  async cancel(jobId) {
    await cancelRunpodJob('qwen3_tts', jobId);
  },
};
