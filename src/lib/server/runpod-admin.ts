import { db } from '@/lib/db';

/**
 * Server-side RunPod control-plane client.
 *
 * The inference API (api.runpod.ai/v2) intentionally remains in runpod.ts.
 * This file uses only the management API, and is deliberately unavailable to
 * browser code so RUNPOD_API_KEY never leaves the server.
 */
const CONTROL_ORIGIN = 'https://rest.runpod.io/v1';
export const PLAYLAB_WORKER_SLOT_LIMIT = 10;

export type ManagedRunpodEngine =
  | 'h3'
  | 'wan'
  | 'ltx'
  | 'flux'
  | 'qwen_image'
  | 'blender'
  | 'character_blender'
  | 'rigging'
  | 'whisper'
  | 'trellis'
  | 'ace_music'
  | 'qwen3_tts';

const KNOWN_ENGINE_IDS: Partial<Record<ManagedRunpodEngine, string>> = {
  h3: process.env.RUNPOD_H3_BLACKWELL_ENDPOINT_ID?.trim() || 'pnskne8mgep2vw',
  wan: process.env.RUNPOD_WAN_ENDPOINT_ID?.trim(),
  ltx: process.env.RUNPOD_LTX_ENDPOINT_ID?.trim(),
  flux: process.env.RUNPOD_FLUX_ENDPOINT_ID?.trim() || '903tt7vd8o46yp',
  qwen_image: process.env.RUNPOD_QWEN_IMAGE_ENDPOINT_ID?.trim() || '50ix6zz1yiywxl',
  blender: process.env.RUNPOD_BLENDER_ENDPOINT_ID?.trim() || 'i15xzduszzdwmo',
  character_blender: process.env.RUNPOD_CHARACTER_BLENDER_ENDPOINT_ID?.trim(),
  rigging: process.env.RUNPOD_RIGGING_ENDPOINT_ID?.trim() || 'jwvz3iksqwm6mb',
  whisper: process.env.RUNPOD_WHISPER_ENDPOINT_ID?.trim(),
  trellis: process.env.RUNPOD_TRELLIS_ENDPOINT_ID?.trim() || 'fmxxi8wa0gxkcm',
  ace_music: process.env.RUNPOD_ACE_STEP_ENDPOINT_ID?.trim() || 'uw755pa2qvi8uo',
  qwen3_tts: process.env.RUNPOD_QWEN3_TTS_ENDPOINT_ID?.trim(),
};

const ENGINE_LABELS: Record<ManagedRunpodEngine, string> = {
  h3: 'MiniMax H3', wan: 'Wan', ltx: 'LTX', flux: 'Flux', qwen_image: 'Qwen Image',
  blender: 'Blender', character_blender: 'Character Blender', rigging: 'SkinTokens Rigging',
  whisper: 'Whisper', trellis: 'TRELLIS', ace_music: 'ACE-Step Music', qwen3_tts: 'Qwen3-TTS',
};

type RawWorker = {
  id?: string;
  desiredStatus?: string;
  lastStatusChange?: string;
  gpu?: { displayName?: string; count?: number };
  image?: string;
};

type RawEndpoint = {
  id?: string;
  name?: string;
  workersMin?: number;
  workersMax?: number;
  gpuCount?: number;
  gpuTypeIds?: string[];
  template?: { imageName?: string };
  workers?: RawWorker[];
  modelStatus?: string;
  idleTimeout?: number;
};

export type RunpodWorkerSnapshot = {
  id: string;
  status: string;
  gpu: string | null;
  image: string | null;
};

export type RunpodEndpointSnapshot = {
  id: string;
  name: string;
  engine: ManagedRunpodEngine | null;
  engineLabel: string | null;
  image: string | null;
  gpu: string[];
  gpuCount: number;
  workersMin: number;
  workersMax: number;
  currentWorkers: number;
  workerStates: RunpodWorkerSnapshot[];
  modelStatus: string | null;
  idleTimeout: number | null;
  appEnabled: boolean;
};

function apiKey() {
  const key = process.env.RUNPOD_API_KEY?.trim();
  if (!key) throw new Error('RUNPOD_API_KEY is not configured');
  return key;
}

async function controlFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CONTROL_ORIGIN}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`RunPod control API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json() as Promise<T>;
}

function asEndpoints(value: unknown): RawEndpoint[] {
  if (Array.isArray(value)) return value as RawEndpoint[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['data', 'endpoints', 'items']) if (Array.isArray(record[key])) return record[key] as RawEndpoint[];
  }
  return [];
}

function normalized(value: string | null | undefined) { return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }

function inferEngine(endpoint: RawEndpoint): ManagedRunpodEngine | null {
  const id = endpoint.id || '';
  for (const [engine, endpointId] of Object.entries(KNOWN_ENGINE_IDS) as [ManagedRunpodEngine, string | undefined][]) {
    if (endpointId && endpointId === id) return engine;
  }
  const source = normalized(`${endpoint.name || ''} ${endpoint.template?.imageName || ''} ${(endpoint.workers || []).map((worker) => worker.image || '').join(' ')}`);
  if (source.includes('qwen3tts') || (source.includes('qwen') && source.includes('tts'))) return 'qwen3_tts';
  if (source.includes('cosyvoice')) return null;
  if (source.includes('acestep')) return 'ace_music';
  if (source.includes('trellis')) return 'trellis';
  if (source.includes('skintoken') || source.includes('rigging')) return 'rigging';
  if (source.includes('whisper')) return 'whisper';
  if (source.includes('qwen') && source.includes('image')) return 'qwen_image';
  if (source.includes('flux')) return 'flux';
  if (source.includes('minimax') || source.includes('h3')) return 'h3';
  if (source.includes('wan')) return 'wan';
  if (source.includes('ltx')) return 'ltx';
  if (source.includes('blender')) return 'blender';
  return null;
}

function settingKey(engine: ManagedRunpodEngine) { return `runpod.engine.${engine}`; }

type EngineSetting = { endpointId?: string; enabled?: boolean };

function readSetting(raw: string | null | undefined): EngineSetting {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as EngineSetting;
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch { return {}; }
}

export async function getRunpodEngineSetting(engine: ManagedRunpodEngine): Promise<EngineSetting> {
  const row = await db.setting.findUnique({ where: { key: settingKey(engine) } });
  return readSetting(row?.value);
}

export async function resolveManagedRunpodEndpointId(engine: ManagedRunpodEngine): Promise<string | null> {
  const setting = await getRunpodEngineSetting(engine);
  return setting.endpointId?.trim() || KNOWN_ENGINE_IDS[engine] || null;
}

export async function assertRunpodEngineEnabled(engine: ManagedRunpodEngine) {
  const setting = await getRunpodEngineSetting(engine);
  if (setting.enabled === false) throw new Error(`${ENGINE_LABELS[engine]} 워커가 관리자에 의해 중지되었습니다.`);
}

export async function getRunpodInventory() {
  const [raw, settings] = await Promise.all([
    controlFetch<unknown>('/endpoints'),
    db.setting.findMany({ where: { key: { startsWith: 'runpod.engine.' } } }),
  ]);
  const configured = new Map<ManagedRunpodEngine, EngineSetting>();
  for (const row of settings) {
    const engine = row.key.slice('runpod.engine.'.length) as ManagedRunpodEngine;
    if (ENGINE_LABELS[engine]) configured.set(engine, readSetting(row.value));
  }
  const endpoints = asEndpoints(raw).flatMap((endpoint): RunpodEndpointSnapshot[] => {
    if (!endpoint.id) return [];
    const engine = inferEngine(endpoint);
    const setting = engine ? configured.get(engine) : undefined;
    const workers = Array.isArray(endpoint.workers) ? endpoint.workers : [];
    const image = endpoint.template?.imageName || workers.find((worker) => worker.image)?.image || null;
    return [{
      id: endpoint.id,
      name: endpoint.name || endpoint.id,
      engine,
      engineLabel: engine ? ENGINE_LABELS[engine] : null,
      image,
      gpu: endpoint.gpuTypeIds || workers.map((worker) => worker.gpu?.displayName).filter((gpu): gpu is string => Boolean(gpu)),
      gpuCount: endpoint.gpuCount || workers[0]?.gpu?.count || 1,
      workersMin: Math.max(0, endpoint.workersMin || 0),
      workersMax: Math.max(0, endpoint.workersMax || 0),
      currentWorkers: workers.length,
      workerStates: workers.map((worker) => ({ id: worker.id || 'unknown', status: worker.desiredStatus || worker.lastStatusChange || 'UNKNOWN', gpu: worker.gpu?.displayName || null, image: worker.image || null })),
      modelStatus: endpoint.modelStatus || null,
      idleTimeout: Number.isFinite(endpoint.idleTimeout) ? endpoint.idleTimeout! : null,
      appEnabled: setting?.enabled !== false,
    }];
  });
  const configuredSlots = endpoints.reduce((sum, endpoint) => sum + endpoint.workersMax, 0);
  const runningWorkers = endpoints.reduce((sum, endpoint) => sum + endpoint.currentWorkers, 0);
  return { endpoints, slotLimit: PLAYLAB_WORKER_SLOT_LIMIT, configuredSlots, runningWorkers, syncedAt: new Date().toISOString() };
}

export async function setRunpodEndpointCapacity(input: { endpointId: string; workersMax: number; engine?: ManagedRunpodEngine | null }) {
  const desired = input.workersMax;
  if (!Number.isInteger(desired) || desired < 0 || desired > PLAYLAB_WORKER_SLOT_LIMIT) throw new Error('워커 수는 0~10 사이의 정수여야 합니다.');
  const inventory = await getRunpodInventory();
  const endpoint = inventory.endpoints.find((item) => item.id === input.endpointId);
  if (!endpoint) throw new Error('RunPod 엔드포인트를 찾을 수 없습니다.');
  const after = inventory.configuredSlots - endpoint.workersMax + desired;
  if (after > PLAYLAB_WORKER_SLOT_LIMIT) throw new Error(`PLAYLAB 워커 한도(${PLAYLAB_WORKER_SLOT_LIMIT})를 초과합니다. 먼저 다른 워커를 줄여주세요.`);
  // Explicit zero matters: it is the reliable Serverless off value, so do not
  // omit workersMin/workersMax when disabling an endpoint.
  await controlFetch<unknown>(`/endpoints/${encodeURIComponent(input.endpointId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ workersMin: 0, workersMax: desired }),
  });
  const engine = input.engine || endpoint.engine;
  if (engine) {
    await db.setting.upsert({
      where: { key: settingKey(engine) },
      create: { key: settingKey(engine), value: JSON.stringify({ endpointId: input.endpointId, enabled: desired > 0 }) },
      update: { value: JSON.stringify({ endpointId: input.endpointId, enabled: desired > 0 }) },
    });
  }
  return getRunpodInventory();
}

export const RUNPOD_ENGINE_OPTIONS = Object.entries(ENGINE_LABELS).map(([id, label]) => ({ id: id as ManagedRunpodEngine, label }));
