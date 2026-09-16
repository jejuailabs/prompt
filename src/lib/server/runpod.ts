// Server-side Runpod Serverless client for ComfyUI video workflows.
// API keys stay in RUNPOD_API_KEY and must never be exposed to the browser.

export type RunpodVideoEngine = 'h3' | 'wan' | 'ltx' | 'flux' | 'blender' | 'whisper';

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

const endpointEnv: Record<RunpodVideoEngine, string> = {
  h3: 'RUNPOD_H3_ENDPOINT_ID',
  wan: 'RUNPOD_WAN_ENDPOINT_ID',
  ltx: 'RUNPOD_LTX_ENDPOINT_ID',
  flux: 'RUNPOD_FLUX_ENDPOINT_ID',
  blender: 'RUNPOD_BLENDER_ENDPOINT_ID',
  whisper: 'RUNPOD_WHISPER_ENDPOINT_ID',
};

function getApiKey(): string {
  const key = process.env.RUNPOD_API_KEY;
  if (!key) throw new Error('RUNPOD_API_KEY is not configured');
  return key;
}

export type H3Gpu = '5090' | 'blackwell';

export function getRunpodEndpointId(engine: RunpodVideoEngine, h3Gpu?: H3Gpu): string | null {
  if (engine === 'h3' && h3Gpu === 'blackwell') {
    return process.env.RUNPOD_H3_BLACKWELL_ENDPOINT_ID?.trim() || 'pnskne8mgep2vw';
  }
  const configured = process.env[endpointEnv[engine]]?.trim();
  if (configured) return configured;
  // The dedicated PLAYLAB Blender endpoint predates the production environment
  // variable. Its ID is not a credential (requests still require RUNPOD_API_KEY),
  // so retain this migration fallback until every deployment has the variable.
  if (engine === 'blender') return 'i15xzduszzdwmo';
  if (engine === 'flux') return '903tt7vd8o46yp';
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
  engine: RunpodVideoEngine,
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
  engine: RunpodVideoEngine,
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
  engine: RunpodVideoEngine,
  jobId: string,
  h3Gpu?: H3Gpu,
): Promise<RunpodJobStatus> {
  const endpointId = getRunpodEndpointId(engine, h3Gpu);
  if (!endpointId) throw new Error(`${endpointEnv[engine]} is not configured`);
  return runpodFetch<RunpodJobStatus>(`/v2/${endpointId}/status/${encodeURIComponent(jobId)}`);
}
