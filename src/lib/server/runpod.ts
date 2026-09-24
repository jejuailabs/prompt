// Server-side Runpod Serverless client for ComfyUI video workflows.
// API keys stay in RUNPOD_API_KEY and must never be exposed to the browser.

export type RunpodVideoEngine = 'h3' | 'wan' | 'ltx';
export type RunpodEngine = RunpodVideoEngine | 'flux' | 'blender' | 'character_blender' | 'rigging' | 'whisper' | 'trellis' | 'ace_music';

export interface RunpodQueuedJob {
  id: string;
  status: string;
  delayTime?: number;
  executionTime?: number;
}

export interface RunpodJobStatus extends RunpodQueuedJob {
  output?: unknown;
  error?: string;
}

export interface RunpodInputImage {
  name: string;
  image: string;
}

const endpointEnv: Record<RunpodEngine, string> = {
  h3: 'RUNPOD_H3_ENDPOINT_ID',
  wan: 'RUNPOD_WAN_ENDPOINT_ID',
  ltx: 'RUNPOD_LTX_ENDPOINT_ID',
  flux: 'RUNPOD_FLUX_ENDPOINT_ID',
  blender: 'RUNPOD_BLENDER_ENDPOINT_ID',
  character_blender: 'RUNPOD_CHARACTER_BLENDER_ENDPOINT_ID',
  rigging: 'RUNPOD_RIGGING_ENDPOINT_ID',
  whisper: 'RUNPOD_WHISPER_ENDPOINT_ID',
  trellis: 'RUNPOD_TRELLIS_ENDPOINT_ID',
  ace_music: 'RUNPOD_ACE_STEP_ENDPOINT_ID',
};

// Endpoint IDs are not credentials. Keep the deployed music worker usable
// while allowing an environment override for a later worker migration.
const DEFAULT_ACE_STEP_ENDPOINT_ID = 'uw755pa2qvi8uo';

function getApiKey(): string {
  const key = process.env.RUNPOD_API_KEY;
  if (!key) throw new Error('RUNPOD_API_KEY is not configured');
  return key;
}

export type H3Gpu = '5090' | 'blackwell';

export function getRunpodEndpointId(engine: RunpodEngine, h3Gpu?: H3Gpu): string | null {
  if (engine === 'h3' && h3Gpu === 'blackwell') {
    return process.env.RUNPOD_H3_BLACKWELL_ENDPOINT_ID?.trim() || 'pnskne8mgep2vw';
  }
  const configured = process.env[endpointEnv[engine]]?.trim();
  if (configured) return configured;
  // The dedicated PLAYLAB Blender endpoint predates the production environment
  // variable. Its ID is not a credential (requests still require RUNPOD_API_KEY),
  // so retain this migration fallback until every deployment has the variable.
  if (engine === 'blender') return 'i15xzduszzdwmo';
  // Never fall back to the legacy architectural Blender endpoint here. Character
  // preparation has a different, strict base64-GLB contract.
  if (engine === 'character_blender') return null;
  // This dedicated self-hosted SkinTokens endpoint is not a credential. Keep the
  // deployment usable when a hosting environment lacks the optional variable;
  // requests still require server-only RUNPOD_API_KEY. Do not substitute the
  // older architectural Blender worker or any paid third-party rigging API.
  if (engine === 'rigging') return 'jwvz3iksqwm6mb';
  if (engine === 'flux') return '903tt7vd8o46yp';
  if (engine === 'trellis') return 'fmxxi8wa0gxkcm';
  if (engine === 'ace_music') return DEFAULT_ACE_STEP_ENDPOINT_ID;
  return null;
}

async function runpodFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.runpod.ai${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Runpod API ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

/** Queue a ComfyUI workflow and return immediately with its Runpod job ID. */
export async function queueRunpodWorkflow(
  engine: RunpodEngine,
  workflow: Record<string, unknown>,
  images?: RunpodInputImage[],
  h3Gpu?: H3Gpu,
): Promise<RunpodQueuedJob> {
  const endpointId = getRunpodEndpointId(engine, h3Gpu);
  if (!endpointId) throw new Error(`${endpointEnv[engine]} is not configured`);

  return runpodFetch<RunpodQueuedJob>(`/v2/${endpointId}/run`, {
    method: 'POST',
    body: JSON.stringify({ input: { workflow, ...(images?.length ? { images } : {}) } }),
  });
}

/** Queue a custom Serverless handler such as the PLAYLAB Blender renderer. */
export async function queueRunpodJob(
  engine: RunpodEngine,
  input: Record<string, unknown>,
): Promise<RunpodQueuedJob> {
  const endpointId = getRunpodEndpointId(engine);
  if (!endpointId) throw new Error(`${endpointEnv[engine]} is not configured`);
  return runpodFetch<RunpodQueuedJob>(`/v2/${endpointId}/run`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
}

/** Poll a queued job. The caller owns the retry interval and timeout policy. */
export async function getRunpodJobStatus(
  engine: RunpodEngine,
  jobId: string,
  h3Gpu?: H3Gpu,
): Promise<RunpodJobStatus> {
  const endpointId = getRunpodEndpointId(engine, h3Gpu);
  if (!endpointId) throw new Error(`${endpointEnv[engine]} is not configured`);
  return runpodFetch<RunpodJobStatus>(`/v2/${endpointId}/status/${encodeURIComponent(jobId)}`);
}

/** Request actual provider cancellation; hiding a spinner is not cancellation. */
export async function cancelRunpodJob(engine: RunpodEngine, jobId: string) {
  const endpointId = getRunpodEndpointId(engine);
  if (!endpointId) throw new Error(`${endpointEnv[engine]} is not configured`);
  return runpodFetch<RunpodQueuedJob>(`/v2/${endpointId}/cancel/${encodeURIComponent(jobId)}`, { method: 'POST' });
}
