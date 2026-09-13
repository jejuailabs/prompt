// Server-side Runpod Serverless client for ComfyUI video workflows.
// API keys stay in RUNPOD_API_KEY and must never be exposed to the browser.

export type RunpodVideoEngine = 'h3' | 'wan' | 'ltx';

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

const endpointEnv: Record<RunpodVideoEngine, string> = {
  h3: 'RUNPOD_H3_ENDPOINT_ID',
  wan: 'RUNPOD_WAN_ENDPOINT_ID',
  ltx: 'RUNPOD_LTX_ENDPOINT_ID',
};

function getApiKey(): string {
  const key = process.env.RUNPOD_API_KEY;
  if (!key) throw new Error('RUNPOD_API_KEY is not configured');
  return key;
}

export function getRunpodEndpointId(engine: RunpodVideoEngine): string | null {
  return process.env[endpointEnv[engine]]?.trim() || null;
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
): Promise<RunpodQueuedJob> {
  const endpointId = getRunpodEndpointId(engine);
  if (!endpointId) throw new Error(`${endpointEnv[engine]} is not configured`);

  return runpodFetch<RunpodQueuedJob>(`/v2/${endpointId}/run`, {
    method: 'POST',
    body: JSON.stringify({ input: { workflow } }),
  });
}

/** Poll a queued job. The caller owns the retry interval and timeout policy. */
export async function getRunpodJobStatus(
  engine: RunpodVideoEngine,
  jobId: string,
): Promise<RunpodJobStatus> {
  const endpointId = getRunpodEndpointId(engine);
  if (!endpointId) throw new Error(`${endpointEnv[engine]} is not configured`);
  return runpodFetch<RunpodJobStatus>(`/v2/${endpointId}/status/${encodeURIComponent(jobId)}`);
}
