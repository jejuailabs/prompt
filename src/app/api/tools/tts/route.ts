import { HttpError, requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/server/handler';
import { beginMeteredOperation, failMeteredOperation, finishMeteredOperation } from '@/lib/server/operation-ledger';
import { activeTtsProvider, ttsProvider, TtsProviderError, type TtsProvider } from '@/lib/server/tts';
import { saveVoiceOutput, signedVoiceOutputUrl } from '@/lib/server/voice-reference-storage';
import { isTtsVoice, TTS_DESIGN_MAX_CHARS, TTS_LANGUAGES, TTS_MAX_CHARS, TTS_STYLES } from '@/lib/tts-voices';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SOURCE_MODULE = 'tool-tts';
const LANGUAGE_IDS = new Set<string>(TTS_LANGUAGES.map((item) => item.id));

type TtsMeta = {
  provider?: string;
  model?: string;
  mode?: 'tts' | 'design';
  description?: string;
  jobId?: string;
  operationId?: string;
  status?: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  voice?: string;
  language?: string;
  style?: string;
  outputPath?: string;
  error?: string;
  queuedAt?: string;
  completedAt?: string;
  executionTimeMs?: number;
};

const FAILED_MESSAGE = '음성 생성에 실패했어요. 사용한 크레딧은 돌려드렸어요. 잠시 후 다시 시도해 주세요.';

function meta(raw: string): TtsMeta { try { return JSON.parse(raw) as TtsMeta; } catch { return {}; } }

async function respond(artifact: { id: string; metadata: string }) {
  const value = meta(artifact.metadata);
  return ok({
    artifactId: artifact.id,
    status: value.status || 'QUEUED',
    error: value.error || null,
    audioUrl: value.outputPath ? await signedVoiceOutputUrl(value.outputPath) : null,
  });
}

async function update(id: string, current: TtsMeta, patch: Partial<TtsMeta>) {
  return db.artifact.update({ where: { id }, data: { metadata: JSON.stringify({ ...current, ...patch } satisfies TtsMeta) } });
}

async function complete(artifactId: string, current: TtsMeta, userId: string, wav: Buffer, executionTimeMs?: number) {
  const outputPath = await saveVoiceOutput({ userId, artifactId, bytes: wav });
  if (current.operationId) await finishMeteredOperation({ operationId: current.operationId, engine: 'qwen3_tts', status: 'COMPLETED', executionTimeMs });
  return update(artifactId, current, { status: 'COMPLETED', outputPath, completedAt: new Date().toISOString(), executionTimeMs });
}

async function markFailed(artifactId: string, current: TtsMeta, providerStatus: string, executionTimeMs?: number) {
  // Refunds the charged credits; the raw provider status stays server-side.
  if (current.operationId) await failMeteredOperation(current.operationId, `Qwen3-TTS ${providerStatus}`);
  return update(artifactId, current, { status: 'FAILED', error: FAILED_MESSAGE, completedAt: new Date().toISOString(), executionTimeMs });
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<Record<string, unknown>>(req);

    if (body.action === 'cancel') {
      const artifact = await db.artifact.findFirst({ where: { id: String(body.artifactId || ''), ownerId: user.id, sourceModule: SOURCE_MODULE } });
      if (!artifact) throw new HttpError('음성 생성 작업을 찾을 수 없어요.', 404);
      const current = meta(artifact.metadata);
      if (current.jobId && (current.status === 'QUEUED' || current.status === 'RUNNING')) {
        await ttsProvider(current.provider)?.cancel(current.jobId).catch(() => undefined);
        if (current.operationId) await failMeteredOperation(current.operationId, 'cancelled by user');
        return respond(await update(artifact.id, current, { status: 'CANCELLED', error: '생성을 취소했어요.', completedAt: new Date().toISOString() }));
      }
      return respond(artifact);
    }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) throw new HttpError('읽을 텍스트를 입력해 주세요.', 400);
    if (text.length > TTS_MAX_CHARS) throw new HttpError(`텍스트는 ${TTS_MAX_CHARS.toLocaleString()}자까지 입력할 수 있어요.`, 400);
    const mode = body.mode === 'design' ? 'design' : 'tts';
    const language = typeof body.language === 'string' && LANGUAGE_IDS.has(body.language) ? body.language : 'Korean';
    const style = TTS_STYLES.find((item) => item.id === body.style) ?? TTS_STYLES[0];
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    let voice: string | undefined;
    if (mode === 'tts') {
      if (!isTtsVoice(body.voice)) throw new HttpError('유효하지 않은 목소리예요.', 400);
      voice = body.voice;
    } else {
      if (!description) throw new HttpError('만들고 싶은 목소리를 설명해 주세요.', 400);
      if (description.length > TTS_DESIGN_MAX_CHARS) throw new HttpError(`목소리 설명은 ${TTS_DESIGN_MAX_CHARS}자까지 입력할 수 있어요.`, 400);
    }
    const instruct = mode === 'design' ? description : style.instruct || undefined;

    const provider: TtsProvider = activeTtsProvider();
    // Only the self-hosted GPU worker is metered; Gemini was never charged.
    const ledger = provider.id === 'qwen'
      ? await beginMeteredOperation({ userId: user.id, engine: 'qwen3_tts', prompt: text, aspect: 'audio', style: voice ?? 'voice-design' })
      : null;

    let current: TtsMeta = {
      provider: provider.id, model: provider.model, mode, operationId: ledger?.operationId, status: 'QUEUED',
      voice, description: mode === 'design' ? description : undefined, language, style: mode === 'tts' ? style.id : undefined, queuedAt: new Date().toISOString(),
    };
    let artifact = await db.artifact.create({ data: {
      ownerId: user.id, type: 'audio', title: text.slice(0, 80), description: mode === 'design' ? 'AI Tools 목소리 디자인 나레이션' : 'AI Tools TTS 나레이션',
      sourceModule: SOURCE_MODULE, visibility: 'private', status: 'draft', metadata: JSON.stringify(current),
    } });

    try {
      const started = await provider.start({ mode, text, voice, language, instruct });
      if (started.kind === 'done') artifact = await complete(artifact.id, current, user.id, started.wav);
      else {
        current = { ...current, jobId: started.jobId };
        artifact = await update(artifact.id, current, { status: 'QUEUED' });
      }
    } catch (error) {
      if (ledger) await failMeteredOperation(ledger.operationId, 'provider start failed');
      const message = error instanceof TtsProviderError ? error.userMessage : FAILED_MESSAGE;
      await update(artifact.id, current, { status: 'FAILED', error: message, completedAt: new Date().toISOString() });
      throw new HttpError(message, error instanceof TtsProviderError ? error.status : 502);
    }
    return respond(artifact);
  } catch (error) {
    return fail(error);
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const artifactId = new URL(req.url).searchParams.get('id');
    if (!artifactId) throw new HttpError('작업 ID가 필요해요.', 400);
    let artifact = await db.artifact.findFirst({ where: { id: artifactId, ownerId: user.id, sourceModule: SOURCE_MODULE } });
    if (!artifact) throw new HttpError('음성 생성 작업을 찾을 수 없어요.', 404);
    const current = meta(artifact.metadata);
    const provider = ttsProvider(current.provider);
    if (!provider || !current.jobId || (current.status !== 'QUEUED' && current.status !== 'RUNNING')) return respond(artifact);

    const result = await provider.check(current.jobId);
    if (result.status === 'done') artifact = await complete(artifact.id, current, user.id, result.wav, result.executionTimeMs);
    else if (result.status === 'failed') artifact = await markFailed(artifact.id, current, result.providerStatus, result.executionTimeMs);
    else if (result.providerStatus === 'IN_PROGRESS' && current.status !== 'RUNNING') {
      if (current.operationId) await finishMeteredOperation({ operationId: current.operationId, engine: 'qwen3_tts', status: 'IN_PROGRESS' });
      artifact = await update(artifact.id, current, { status: 'RUNNING' });
    }
    return respond(artifact);
  } catch (error) {
    return fail(error);
  }
}
