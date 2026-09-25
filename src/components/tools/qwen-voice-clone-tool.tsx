'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileAudio, Loader2, Mic2, Square, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type CloneJob = { artifactId: string; status: string; error: string | null; model: string; executionTimeMs: number | null; delayTimeMs: number | null; audioUrl?: string | null };
type UploadTicket = { bucket: string; path: string; token: string; contentType: string };
const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']);
const ALLOWED = new Set(['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/ogg']);

function duration(value: number | null) {
  if (value === null || value === undefined) return '측정 중';
  const seconds = Math.max(0, Math.round(value / 1000));
  return seconds >= 60 ? `${Math.floor(seconds / 60)}분 ${seconds % 60}초` : `${seconds}초`;
}
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || '요청을 처리하지 못했습니다.');
  return payload.data as T;
}

export function QwenVoiceCloneTool() {
  const [sample, setSample] = useState<File | null>(null);
  const [referenceText, setReferenceText] = useState('안녕하세요. 이 목소리를 기준으로 자연스럽고 또렷한 나레이션을 생성해 주세요.');
  const [script, setScript] = useState('PLAYLAB에서 내 목소리로 만드는 자연스러운 AI 나레이션입니다.');
  const [language, setLanguage] = useState('Korean');
  const [consent, setConsent] = useState(false);
  const [job, setJob] = useState<CloneJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (artifactId: string) => {
    try {
      const next = await request<CloneJob>(`/api/tools/tts/clone?id=${encodeURIComponent(artifactId)}`);
      setJob(next);
      if (next.error) setError(next.error);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '생성 상태를 불러오지 못했습니다.'); }
  }, []);

  useEffect(() => {
    if (!job || TERMINAL.has(job.status)) return;
    const first = window.setTimeout(() => void refresh(job.artifactId), 0);
    const timer = window.setInterval(() => void refresh(job.artifactId), 3500);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [job, refresh]);

  async function generate() {
    if (!sample) { setError('본인 음성 샘플을 선택해주세요.'); return; }
    if (sample.size > 25 * 1024 * 1024) { setError('참조 음성은 25MB 이하만 사용할 수 있습니다.'); return; }
    if (!ALLOWED.has(sample.type) && !/\.(mp3|m4a|aac|wav|wave|flac|ogg)$/i.test(sample.name)) { setError('MP3, M4A, AAC, WAV, FLAC, OGG 파일만 사용할 수 있습니다.'); return; }
    setBusy(true); setError('');
    try {
      const ticket = await request<UploadTicket>('/api/tools/tts/clone/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: sample.name }) });
      const uploaded = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, sample, { contentType: ticket.contentType });
      if (uploaded.error) throw new Error(`참조 음성 업로드 실패: ${uploaded.error.message}`);
      const next = await request<CloneJob>('/api/tools/tts/clone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: script, referenceText, referencePath: ticket.path, language }) });
      setJob(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '내 목소리 TTS를 시작하지 못했습니다.'); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!job) return;
    setBusy(true); setError('');
    try { setJob(await request<CloneJob>('/api/tools/tts/clone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', artifactId: job.artifactId }) })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '생성을 중지하지 못했습니다.'); }
    finally { setBusy(false); }
  }

  const active = Boolean(job && !TERMINAL.has(job.status));
  return <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/[.025] p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-bold"><Mic2 className="size-5 text-primary" />내 목소리 나레이션</h2><p className="mt-1 text-sm text-muted-foreground">Qwen3-TTS가 본인이 제공한 음성과 대본을 기준으로 한국어 나레이션을 만듭니다.</p></div><span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Qwen3-TTS · 보이스 클로닝</span></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="grid gap-2 text-sm font-medium">본인 음성 샘플 <input type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/flac,audio/ogg,.mp3,.m4a,.aac,.wav,.flac,.ogg" disabled={active || busy} onChange={(event) => setSample(event.target.files?.[0] || null)} className="rounded-lg border bg-background p-2 text-sm" /><span className="text-xs font-normal text-muted-foreground">{sample ? `${sample.name} · ${(sample.size / 1024 / 1024).toFixed(1)}MB` : '10~45초 길이의 깨끗한 단독 음성 권장 · 최대 25MB'}</span></label><label className="grid gap-2 text-sm font-medium">음성 언어 <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={active || busy} className="rounded-lg border bg-background px-3 py-2 text-sm"><option value="Korean">한국어</option><option value="Auto">자동 감지</option><option value="English">English</option><option value="Japanese">日本語</option><option value="Chinese">中文</option></select></label></div>
    <label className="mt-4 grid gap-2 text-sm font-medium">샘플에서 실제로 말한 문장 <textarea value={referenceText} onChange={(event) => setReferenceText(event.target.value)} disabled={active || busy} maxLength={6000} rows={3} className="rounded-lg border bg-background p-3 text-sm leading-6" /><span className="text-xs font-normal text-muted-foreground">음성 샘플의 실제 내용과 최대한 정확히 일치해야 발음과 화자 특성이 안정적입니다.</span></label>
    <label className="mt-4 grid gap-2 text-sm font-medium">새로 읽을 나레이션 <textarea value={script} onChange={(event) => setScript(event.target.value)} disabled={active || busy} maxLength={6000} rows={5} className="rounded-lg border bg-background p-3 text-sm leading-6" /></label>
    <label className="mt-4 flex items-start gap-2 rounded-xl border bg-background p-3 text-sm"><input type="checkbox" checked={consent} disabled={active || busy} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5" /><span>나는 이 음성의 본인이거나 명시적 사용 권한을 보유하며, 이 요청에 한해 음성 복제를 허용합니다. 참조 음성과 결과는 비공개 저장소에 보관됩니다.</span></label>
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy || active || !sample || !referenceText.trim() || !script.trim() || !consent} onClick={() => void generate()} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{active ? '생성 진행 중' : '내 목소리로 만들기'}</button>{active && <button type="button" disabled={busy} onClick={() => void cancel()} className="inline-flex items-center gap-2 rounded-md border px-5 py-3 font-semibold text-destructive disabled:opacity-50"><Square className="size-4 fill-current" />생성 중지</button>}</div>
    {error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {job && <div className="mt-5 rounded-xl border bg-background p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{job.status === 'COMPLETED' ? '내 목소리 나레이션이 완성되었습니다.' : job.status === 'FAILED' ? '생성에 실패했습니다.' : 'Qwen3-TTS가 음성 특성을 반영해 생성 중입니다.'}</p><p className="mt-1 text-xs text-muted-foreground">대기 {duration(job.delayTimeMs)} · GPU 실행 {duration(job.executionTimeMs)} · {job.model}</p></div><FileAudio className="size-5 text-primary" /></div>{job.audioUrl && <div className="mt-4"><audio controls className="w-full" src={job.audioUrl} /><a href={job.audioUrl} download="playlab-voice-clone.wav" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Download className="size-4" />WAV 다운로드</a></div>}</div>}
  </section>;
}
