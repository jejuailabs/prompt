import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFast } from '@/lib/auth';
import { queueRunpodJob, getRunpodJobStatus, getRunpodEndpointId } from '@/lib/server/runpod';
import { beginMeteredOperation, finishMeteredOperation, failMeteredOperation } from '@/lib/server/operation-ledger';

const POLL_INTERVAL = 2000;
const MAX_POLLS = 150; // 5분

function toSrt(seconds: number) {
  const ms = Math.round((seconds % 1) * 1000);
  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export async function POST(req: NextRequest) {
  const endpointId = getRunpodEndpointId('whisper');
  if (!endpointId) {
    return NextResponse.json({ error: 'Whisper 워커가 구성되지 않았습니다. RUNPOD_WHISPER_ENDPOINT_ID를 설정해주세요.' }, { status: 503 });
  }

  const user = await getSessionUserFast();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { audioUrl, language = 'ko', fileName = 'audio' } = await req.json();
    if (!audioUrl || typeof audioUrl !== 'string') {
      return NextResponse.json({ error: '오디오 URL이 필요합니다.' }, { status: 400 });
    }

    const ledger = await beginMeteredOperation({
      userId: user.id,
      engine: 'whisper',
      prompt: fileName,
      aspect: 'audio',
      style: language,
    });

    let job;
    try {
      job = await queueRunpodJob('whisper', {
        audio_url: audioUrl,
        language,
        model: 'large-v3',
        word_timestamps: true,
      });
    } catch (error) {
      await failMeteredOperation(ledger.operationId, error instanceof Error ? error.message : 'RunPod Whisper 요청 실패');
      throw error;
    }

    let status = job;
    for (let i = 0; i < MAX_POLLS; i++) {
      if (['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(status.status)) break;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      status = await getRunpodJobStatus('whisper', job.id);
    }

    await finishMeteredOperation({
      operationId: ledger.operationId,
      engine: 'whisper',
      status: status.status,
      executionTimeMs: status.executionTime,
      error: status.error,
    });

    if (status.status !== 'COMPLETED' || !status.output) {
      return NextResponse.json({
        error: status.error || '음성 인식이 완료되지 않았습니다. 다시 시도해주세요.',
      }, { status: 500 });
    }

    const output = status.output as { text?: string; segments?: Array<{ start: number; end: number; text: string }> };
    const text = output.text ?? '';
    const segments = output.segments ?? [];
    const srt = segments
      .map((seg, i) => `${i + 1}\n${toSrt(seg.start)} --> ${toSrt(seg.end)}\n${seg.text.trim()}\n`)
      .join('\n');

    return NextResponse.json({ text, segments, srt, engine: 'whisper-large-v3', jobId: job.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '음성 인식에 실패했습니다.' },
      { status: 500 },
    );
  }
}
