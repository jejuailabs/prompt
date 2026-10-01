export interface VideoUpscaleJob {
  id: string;
  status: string;
  delayTime?: number;
  executionTime?: number;
  output?: unknown;
  error?: string;
}

// This endpoint ID is intentionally not secret. The deployment still requires
// RUNPOD_API_KEY, while an environment override keeps later worker migrations
// from requiring a code release.
const DEFAULT_UPSCALE_ENDPOINT_ID = '5ac3hl7jhqcu1s';

function endpoint() {
  return process.env.RUNPOD_UPSCALE_ENDPOINT_ID?.trim() || DEFAULT_UPSCALE_ENDPOINT_ID;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.RUNPOD_API_KEY;
  if (!key) throw new Error('RUNPOD_API_KEY is not configured');
  const response = await fetch(`https://api.runpod.ai${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Runpod API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json() as Promise<T>;
}

export function isVideoUpscaleConfigured() {
  return Boolean(process.env.RUNPOD_API_KEY);
}

export function queueVideoUpscale(input: Record<string, unknown>) {
  return request<VideoUpscaleJob>(`/v2/${endpoint()}/run`, { method: 'POST', body: JSON.stringify({ input }) });
}

export function getVideoUpscaleStatus(jobId: string) {
  return request<VideoUpscaleJob>(`/v2/${endpoint()}/status/${encodeURIComponent(jobId)}`);
}

export function cancelVideoUpscale(jobId: string) {
  return request<VideoUpscaleJob>(`/v2/${endpoint()}/cancel/${encodeURIComponent(jobId)}`, { method: 'POST' });
}
