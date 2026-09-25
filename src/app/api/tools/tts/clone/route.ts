import { HttpError, requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { cancelRunpodJob, getRunpodJobStatus, queueRunpodJob } from '@/lib/server/runpod';
import { fail, ok, readJson } from '@/lib/server/handler';
import { downloadVoiceReference, isOwnedVoiceReference, saveVoiceOutput, signedVoiceOutputUrl } from '@/lib/server/voice-reference-storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']);
const MAX_REFERENCE_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;
const LANGUAGES = new Set(['Korean', 'Auto', 'English', 'Japanese', 'Chinese']);

type CloneMeta = {
  runpodJobId?: string;
  status?: string;
  text?: string;
  language?: string;
  referencePath?: string;
  outputPath?: string;
  error?: string;
  queuedAt?: string;
  completedAt?: string;
  executionTimeMs?: number;
  delayTimeMs?: number;
  model?: string;
};

function meta(raw: string): CloneMeta { try { return JSON.parse(raw) as CloneMeta; } catch { return {}; } }
function text(value: unknown, label: string, max: number) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(`${label}을 입력해주세요.`, 400);
  const normalized = value.trim();
  if (normalized.length > max) throw new HttpError(`${label}은 ${max.toLocaleString()}자까지 입력할 수 있습니다.`, 400);
  return normalized;
}
function responseFor(artifact: { id: string; metadata: string }) {
  const value = meta(artifact.metadata);
  return { artifactId: artifact.id, status: value.status || 'QUEUED', error: value.error || null, model: value.model || 'Qwen3-TTS-12Hz-1.7B-Base', executionTimeMs: value.executionTimeMs ?? null, delayTimeMs: value.delayTimeMs ?? null, outputPath: value.outputPath || null };
}
function outputBytes(output: unknown) {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return null;
  const encoded = (output as Record<string, unknown>).audio_base64;
  if (typeof encoded !== 'string' || !encoded || encoded.length > MAX_OUTPUT_BYTES * 1.4) return null;
  const bytes = Buffer.from(encoded, 'base64');
  return bytes.length > 0 && bytes.length <= MAX_OUTPUT_BYTES ? bytes : null;
}
async function requireCloneAccess(user: { role: string }) {
  // Voice cloning is intentionally held to administrator validation until a
  // public price/refund policy is set. The RunPod worker itself is reusable for
  // users once this explicit gate is enabled.
  if (user.role !== 'admin' && process.env.RUNPOD_QWEN3_TTS_USER_ENABLED !== 'true') throw new HttpError('내 목소리 TTS는 현재 관리자 검증 단계입니다.', 403);
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    await requireCloneAccess(user);
    const body = await readJson<Record<string, unknown>>(req);
    if (body.action === 'cancel') {
      const artifactId = text(body.artifactId, '작업 ID', 100);
      const artifact = await db.artifact.findFirst({ where: { id: artifactId, ownerId: user.id, sourceModule: 'tool-tts-voice-clone' } });
      if (!artifact) throw new HttpError('음성 생성 작업을 찾을 수 없습니다.', 404);
      const current = meta(artifact.metadata);
      if (current.runpodJobId && !TERMINAL.has(current.status || '')) await cancelRunpodJob('qwen3_tts', current.runpodJobId);
      const updated = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify({ ...current, status: 'CANCELLED', error: '사용자가 생성 작업을 취소했습니다.', completedAt: new Date().toISOString() } satisfies CloneMeta) } });
      return ok(responseFor(updated));
    }

    const content = text(body.text, '읽을 대본', 6_000);
    const referenceText = text(body.referenceText, '참조 음성 대본', 6_000);
    const referencePath = text(body.referencePath, '참조 음성', 500);
    if (!isOwnedVoiceReference(referencePath, user.id)) throw new HttpError('본인이 올린 참조 음성만 사용할 수 있습니다.', 403);
    const language = typeof body.language === 'string' ? body.language : 'Korean';
    if (!LANGUAGES.has(language)) throw new HttpError('지원하지 않는 언어입니다.', 400);
    const reference = await downloadVoiceReference(referencePath);
    if (!reference.length || reference.length > MAX_REFERENCE_BYTES) throw new HttpError('참조 음성은 25MB 이하로 업로드해주세요.', 400);

    let artifact = await db.artifact.create({ data: {
      ownerId: user.id, type: 'audio', title: content.slice(0, 80), description: 'Qwen3-TTS 사용자 음성 나레이션', sourceModule: 'tool-tts-voice-clone', visibility: 'private', status: 'draft',
      metadata: JSON.stringify({ status: 'QUEUED', text: content, language, referencePath, queuedAt: new Date().toISOString(), model: 'Qwen3-TTS-12Hz-1.7B-Base' } satisfies CloneMeta),
    } });
    try {
      const job = await queueRunpodJob('qwen3_tts', { text: content, ref_text: referenceText, language, ref_audio_base64: reference.toString('base64') });
      artifact = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify({ ...meta(artifact.metadata), runpodJobId: job.id, status: job.status || 'IN_QUEUE' } satisfies CloneMeta) } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Qwen3-TTS 작업을 시작하지 못했습니다.';
      artifact = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify({ ...meta(artifact.metadata), status: 'FAILED', error: message, completedAt: new Date().toISOString() } satisfies CloneMeta) } });
    }
    return ok(responseFor(artifact));
  } catch (error) {
    return fail(error);
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    await requireCloneAccess(user);
    const artifactId = new URL(req.url).searchParams.get('id');
    if (!artifactId) throw new HttpError('작업 ID가 필요합니다.', 400);
    let artifact = await db.artifact.findFirst({ where: { id: artifactId, ownerId: user.id, sourceModule: 'tool-tts-voice-clone' } });
    if (!artifact) throw new HttpError('음성 생성 작업을 찾을 수 없습니다.', 404);
    const current = meta(artifact.metadata);
    if (!current.runpodJobId || TERMINAL.has(current.status || '')) {
      const result = responseFor(artifact);
      return ok({ ...result, audioUrl: current.outputPath ? await signedVoiceOutputUrl(current.outputPath) : null });
    }
    const job = await getRunpodJobStatus('qwen3_tts', current.runpodJobId);
    if (job.status === 'COMPLETED') {
      const bytes = outputBytes(job.output);
      if (!bytes) {
        artifact = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify({ ...current, status: 'FAILED', error: 'Qwen3-TTS가 재생 가능한 WAV 결과를 반환하지 않았습니다.', completedAt: new Date().toISOString(), executionTimeMs: job.executionTime, delayTimeMs: job.delayTime } satisfies CloneMeta) } });
      } else {
        const outputPath = await saveVoiceOutput({ userId: user.id, artifactId: artifact.id, bytes });
        artifact = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify({ ...current, status: 'COMPLETED', outputPath, completedAt: new Date().toISOString(), executionTimeMs: job.executionTime, delayTimeMs: job.delayTime } satisfies CloneMeta) } });
      }
    } else if (TERMINAL.has(job.status)) {
      artifact = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify({ ...current, status: job.status, error: job.error || 'Qwen3-TTS 생성이 완료되지 않았습니다.', completedAt: new Date().toISOString(), executionTimeMs: job.executionTime, delayTimeMs: job.delayTime } satisfies CloneMeta) } });
    } else {
      artifact = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify({ ...current, status: job.status, executionTimeMs: job.executionTime, delayTimeMs: job.delayTime } satisfies CloneMeta) } });
    }
    const updated = meta(artifact.metadata);
    return ok({ ...responseFor(artifact), audioUrl: updated.outputPath ? await signedVoiceOutputUrl(updated.outputPath) : null });
  } catch (error) {
    return fail(error);
  }
}
