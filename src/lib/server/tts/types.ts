// Provider-neutral TTS contract. Routes and UI only know this interface; the
// concrete engine (RunPod Qwen3-TTS, Gemini, ...) is selected in ./index.ts.

export type TtsProviderId = 'qwen' | 'gemini';

export type TtsMode = 'tts' | 'design';

/**
 * mode "tts": preset speaker (voice) with an optional style instruct.
 * mode "design": no preset speaker; instruct is the natural-language voice description.
 */
export type TtsRequest = {
  mode: TtsMode;
  text: string;
  voice?: string;
  language: string;
  instruct?: string;
};

/** A provider either finishes synchronously or hands back a job to poll. */
export type TtsStartResult =
  | { kind: 'done'; wav: Buffer }
  | { kind: 'queued'; jobId: string };

export type TtsCheckResult =
  | { status: 'pending'; providerStatus: string }
  | { status: 'done'; wav: Buffer; executionTimeMs?: number }
  | { status: 'failed'; providerStatus: string; executionTimeMs?: number };

export interface TtsProvider {
  id: TtsProviderId;
  /** Model label stored with the artifact for traceability. */
  model: string;
  start(request: TtsRequest): Promise<TtsStartResult>;
  check(jobId: string): Promise<TtsCheckResult>;
  cancel(jobId: string): Promise<void>;
}

/**
 * Failure safe to show the user. Provider/raw messages never cross this
 * boundary (CLAUDE.md: no raw provider errors to clients or logs).
 */
export class TtsProviderError extends Error {
  constructor(public readonly userMessage: string, public readonly status: number) {
    super(userMessage);
  }
}
