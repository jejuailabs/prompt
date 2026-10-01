import { NextRequest } from 'next/server';
import { HttpError, requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { cancelRunpodJob, getRunpodEndpointId, getRunpodJobStatus, queueRunpodJob } from '@/lib/server/runpod';
import { fail, ok, readJson } from '@/lib/server/handler';
import { beginMeteredOperation, failMeteredOperation, finishMeteredOperation } from '@/lib/server/operation-ledger';
import { uploadBuffer } from '@/lib/server/storage';

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']);
const MAX_AUDIO_BYTES = 60 * 1024 * 1024;
const ALLOWED_LANGUAGES = new Set(['ko', 'en', 'ja', 'zh', 'unknown']);

type MusicMeta = {
  engine?: 'ace_music';
  model?: string;
  runpodJobId?: string;
  accountingJobId?: string;
  status?: string;
  prompt?: string;
  lyrics?: string;
  instrumental?: boolean;
  vocalLanguage?: string;
  durationSec?: number;
  bpm?: number | null;
  queuedAt?: string;
  completedAt?: string;
  executionTimeMs?: number;
  delayTimeMs?: number;
  error?: string;
  seed?: string;
};

function parseMeta(raw: string): MusicMeta {
  try { return JSON.parse(raw) as MusicMeta; } catch { return {}; }
}

function asText(value: unknown, name: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(`${name}을(를) 입력해주세요.`, 400);
    return '';
  }
  if (typeof value !== 'string') throw new HttpError(`${name} 형식이 올바르지 않습니다.`, 400);
  const result = value.trim();
  if (required && !result) throw new HttpError(`${name}을(를) 입력해주세요.`, 400);
  if (result.length > max) throw new HttpError(`${name}은(는) ${max.toLocaleString()}자까지 입력할 수 있습니다.`, 400);
  return result;
}

function integer(value: unknown, fallback: number, min: number, max: number, name: string): number {
  if (value === undefined || value === null || value === '') return fallback;
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new HttpError(`${name}은(는) ${min}~${max} 범위의 정수여야 합니다.`, 400);
  }
  return value as number;
}

function responseFor(artifact: { id: string; fileUrl: string | null; metadata: string }) {
  const meta = parseMeta(artifact.metadata);
  return {
    artifactId: artifact.id,
    status: meta.status ?? 'QUEUED',
    audioUrl: artifact.fileUrl,
    error: meta.error ?? null,
    executionTimeMs: meta.executionTimeMs ?? null,
    delayTimeMs: meta.delayTimeMs ?? null,
    durationSec: meta.durationSec ?? null,
    model: meta.model ?? 'acestep-v15-xl-turbo',
  };
}

function outputAudio(output: unknown): { audio: Buffer; seed?: string } | null {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return null;
  const record = output as Record<string, unknown>;
  const encoded = record.audio_base64;
  if (typeof encoded !== 'string' || !encoded || encoded.length > MAX_AUDIO_BYTES * 1.4) return null;
  const audio = Buffer.from(encoded, 'base64');
  if (!audio.length || audio.length > MAX_AUDIO_BYTES) return null;
  return { audio, seed: typeof record.seed === 'string' ? record.seed : undefined };
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<Record<string, unknown>>(req);
    if (body.action === 'cancel') {
      const artifactId = asText(body.artifactId, '작업 ID', 100, true);
      const artifact = await db.artifact.findFirst({ where: { id: artifactId, ownerId: user.id, sourceModule: 'tool-ace-music' } });
      if (!artifact) throw new HttpError('음악 생성 작업을 찾을 수 없습니다.', 404);
      const meta = parseMeta(artifact.metadata);
      if (!meta.runpodJobId || TERMINAL.has(meta.status ?? '')) return ok(responseFor(artifact));
      await cancelRunpodJob('ace_music', meta.runpodJobId);
      const next: MusicMeta = { ...meta, status: 'CANCELLED', completedAt: new Date().toISOString(), error: '사용자가 생성 작업을 취소했습니다.' };
      const updated = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify(next), status: 'draft' } });
      if (meta.accountingJobId) await failMeteredOperation(meta.accountingJobId, next.error);
      return ok(responseFor(updated));
    }

    if (!getRunpodEndpointId('ace_music')) {
      throw new HttpError('ACE-Step RTX 4090 워커가 아직 연결되지 않았습니다. 관리자에게 RUNPOD_ACE_STEP_ENDPOINT_ID 설정을 요청해주세요.', 503);
    }

    const prompt = asText(body.prompt, '음악 설명', 2_000, true);
    const instrumental = body.instrumental === true;
    const lyrics = instrumental ? '' : asText(body.lyrics, '가사', 8_000);
    const vocalLanguage = asText(body.vocalLanguage, '보컬 언어', 20) || 'ko';
    if (!ALLOWED_LANGUAGES.has(vocalLanguage)) throw new HttpError('지원하지 않는 보컬 언어입니다.', 400);
    const durationSec = integer(body.durationSec, 30, 10, 120, '길이');
    const bpm = body.bpm === null || body.bpm === undefined || body.bpm === '' ? null : integer(body.bpm, 120, 30, 300, 'BPM');
    const title = (asText(body.title, '제목', 120) || prompt).slice(0, 120);

    const ledger = await beginMeteredOperation({ userId: user.id, engine: 'ace_music', prompt, aspect: 'audio', style: instrumental ? 'instrumental' : vocalLanguage, creditCharge: Math.ceil((durationSec / 30) * 40) });
    const queuedAt = new Date().toISOString();
    let artifact;
    try {
      artifact = await db.artifact.create({
        data: {
          ownerId: user.id,
          type: 'audio',
          title,
          description: prompt,
          sourceModule: 'tool-ace-music',
          visibility: 'private',
          status: 'draft',
          metadata: JSON.stringify({ engine: 'ace_music', model: 'acestep-v15-xl-turbo', status: 'QUEUED', prompt, lyrics, instrumental, vocalLanguage, durationSec, bpm, queuedAt, accountingJobId: ledger.operationId } satisfies MusicMeta),
        },
      });
      await db.generationJob.update({ where: { id: ledger.operationId }, data: { resultArtifactId: artifact.id } });
      const job = await queueRunpodJob('ace_music', {
        prompt: instrumental ? `${prompt}. Instrumental only, no singing, no spoken words.` : prompt,
        lyrics,
        instrumental,
        vocal_language: vocalLanguage,
        duration_sec: durationSec,
        bpm,
        model: 'acestep-v15-xl-turbo',
        inference_steps: 8,
        thinking: true,
      });
      const next: MusicMeta = { ...parseMeta(artifact.metadata), runpodJobId: job.id, status: job.status || 'IN_QUEUE' };
      artifact = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify(next) } });
    } catch (error) {
      await failMeteredOperation(ledger.operationId, error instanceof Error ? error.message : 'ACE-Step 작업을 시작하지 못했습니다.');
      throw error;
    }
    return ok(responseFor(artifact));
  } catch (error) {
    return fail(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const artifactId = new URL(req.url).searchParams.get('id');
    if (!artifactId) throw new HttpError('작업 ID가 필요합니다.', 400);
    let artifact = await db.artifact.findFirst({ where: { id: artifactId, ownerId: user.id, sourceModule: 'tool-ace-music' } });
    if (!artifact) throw new HttpError('음악 생성 작업을 찾을 수 없습니다.', 404);
    const meta = parseMeta(artifact.metadata);
    if (!meta.runpodJobId || (meta.status === 'COMPLETED' && artifact.fileUrl) || TERMINAL.has(meta.status ?? '')) return ok(responseFor(artifact));

    const job = await getRunpodJobStatus('ace_music', meta.runpodJobId);
    const terminal = TERMINAL.has(job.status);
    if (job.status === 'COMPLETED') {
      const result = outputAudio(job.output);
      if (!result) {
        const error = 'ACE-Step 워커가 재생 가능한 MP3 결과를 반환하지 않았습니다.';
        const failed: MusicMeta = { ...meta, status: 'FAILED', error, completedAt: new Date().toISOString(), executionTimeMs: job.executionTime, delayTimeMs: job.delayTime };
        artifact = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify(failed), status: 'draft' } });
        await finishMeteredOperation({ operationId: meta.accountingJobId, engine: 'ace_music', status: 'FAILED', executionTimeMs: job.executionTime, error });
        return ok(responseFor(artifact));
      }
      const fileUrl = await uploadBuffer(`music-renders/${user.id}/${artifact.id}-${meta.runpodJobId}.mp3`, result.audio, 'audio/mpeg');
      const completed: MusicMeta = { ...meta, status: 'COMPLETED', completedAt: new Date().toISOString(), executionTimeMs: job.executionTime, delayTimeMs: job.delayTime, ...(result.seed ? { seed: result.seed } : {}) };
      artifact = await db.artifact.update({ where: { id: artifact.id }, data: { fileUrl, metadata: JSON.stringify(completed), status: 'draft' } });
      await finishMeteredOperation({ operationId: meta.accountingJobId, engine: 'ace_music', status: job.status, executionTimeMs: job.executionTime });
      return ok(responseFor(artifact));
    }

    if (terminal) {
      const error = job.error || 'ACE-Step 음악 생성이 완료되지 않았습니다.';
      const failed: MusicMeta = { ...meta, status: job.status, error, completedAt: new Date().toISOString(), executionTimeMs: job.executionTime, delayTimeMs: job.delayTime };
      artifact = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify(failed), status: 'draft' } });
      await finishMeteredOperation({ operationId: meta.accountingJobId, engine: 'ace_music', status: job.status, executionTimeMs: job.executionTime, error });
      return ok(responseFor(artifact));
    }

    const running: MusicMeta = { ...meta, status: job.status, executionTimeMs: job.executionTime, delayTimeMs: job.delayTime };
    artifact = await db.artifact.update({ where: { id: artifact.id }, data: { metadata: JSON.stringify(running), status: 'draft' } });
    await finishMeteredOperation({ operationId: meta.accountingJobId, engine: 'ace_music', status: job.status, executionTimeMs: job.executionTime });
    return ok(responseFor(artifact));
  } catch (error) {
    return fail(error);
  }
}
