'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Music2, Square, Sparkles } from 'lucide-react';

type MusicJob = {
  artifactId: string;
  status: string;
  audioUrl: string | null;
  error: string | null;
  executionTimeMs: number | null;
  delayTimeMs: number | null;
  durationSec: number | null;
  model: string;
};

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']);
const statusLabel: Record<string, string> = {
  IN_QUEUE: 'GPU 대기열에서 워커를 준비하고 있습니다.',
  IN_PROGRESS: 'XL-Turbo가 음악을 생성하고 있습니다.',
  QUEUED: '음악 생성 작업을 접수했습니다.',
  COMPLETED: '생성이 완료되었습니다.',
  FAILED: '생성에 실패했습니다.',
  CANCELLED: '생성 작업을 취소했습니다.',
  TIMED_OUT: '생성 시간이 초과되었습니다.',
};

function formatMs(value: number | null) {
  if (value === null || value === undefined) return '측정 중';
  const total = Math.max(0, Math.round(value / 1000));
  return total >= 60 ? `${Math.floor(total / 60)}분 ${total % 60}초` : `${total}초`;
}

async function request(url: string, init?: RequestInit): Promise<MusicJob> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || '요청을 처리하지 못했습니다.');
  return payload.data as MusicJob;
}

export function AceMusicTool() {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('따뜻한 여름밤 드라이브에 어울리는 감성적인 K-pop, 맑은 여성 보컬, 부드러운 신스와 기타, 기억에 남는 후렴');
  const [lyrics, setLyrics] = useState('[Verse]\n창문 너머로 번지는 불빛\n오늘의 마음을 따라가\n\n[Chorus]\n우리의 밤은 노래가 되어\n별빛처럼 오래 남아');
  const [instrumental, setInstrumental] = useState(false);
  const [language, setLanguage] = useState('ko');
  const [duration, setDuration] = useState(30);
  const [bpm, setBpm] = useState('108');
  const [job, setJob] = useState<MusicJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (id: string) => {
    try {
      const next = await request(`/api/tools/ace-music?id=${encodeURIComponent(id)}`);
      setJob(next);
      if (next.error) setError(next.error);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '진행 상태를 불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    if (!job?.artifactId || TERMINAL.has(job.status)) return;
    const initial = window.setTimeout(() => void refresh(job.artifactId), 0);
    const timer = window.setInterval(() => void refresh(job.artifactId), 3500);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [job?.artifactId, job?.status, refresh]);

  async function generate() {
    setSubmitting(true);
    setError('');
    try {
      const next = await request('/api/tools/ace-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          prompt,
          lyrics,
          instrumental,
          vocalLanguage: language,
          durationSec: duration,
          bpm: bpm ? Number(bpm) : null,
        }),
      });
      setJob(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '음악 생성을 시작하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel() {
    if (!job) return;
    setSubmitting(true);
    setError('');
    try {
      setJob(await request('/api/tools/ace-music', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', artifactId: job.artifactId }) }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '생성 작업을 취소하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  const active = Boolean(job && !TERMINAL.has(job.status));
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="flex items-center gap-2 text-2xl font-bold"><Music2 className="size-6 text-primary" />ACE-Step 노래 생성</h2><p className="mt-1 text-sm text-muted-foreground">RTX 4090급 GPU에서 ACE-Step 1.5 XL-Turbo 8스텝으로 MP3를 생성합니다.</p></div>
      <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">XL-Turbo · 8 steps · {Math.ceil((duration / 30) * 40)} 크레딧</span>
    </div>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">제목 <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="예: 여름밤 드라이브" className="rounded-lg border bg-background px-3 py-2.5 text-sm" /></label>
      <label className="grid gap-2 text-sm font-medium">보컬 언어 <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={instrumental} className="rounded-lg border bg-background px-3 py-2.5 text-sm disabled:opacity-50"><option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option><option value="unknown">자동 감지</option></select></label>
    </div>
    <label className="mt-4 grid gap-2 text-sm font-medium">음악 설명 <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} rows={5} className="rounded-lg border bg-background p-3 text-sm leading-6" placeholder="장르, 분위기, 악기, 보컬, 구조를 자연어로 적어주세요." /></label>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4"><div><p className="text-sm font-semibold">보컬 없이 배경음악으로 생성</p><p className="mt-1 text-xs text-muted-foreground">선택하면 가사 없이 연주곡으로 생성합니다.</p></div><button type="button" onClick={() => setInstrumental((value) => !value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${instrumental ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}>{instrumental ? '연주곡' : '보컬곡'}</button></div>
    {!instrumental && <label className="mt-4 grid gap-2 text-sm font-medium">가사 <textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} maxLength={8000} rows={8} className="rounded-lg border bg-background p-3 font-mono text-sm leading-6" placeholder="[Verse], [Chorus] 형식으로 가사를 입력하세요. 비워두면 보컬 스타일만 생성합니다." /></label>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><fieldset><legend className="mb-2 text-sm font-medium">길이</legend><div className="flex gap-2">{[30, 60, 90].map((value) => <button key={value} type="button" onClick={() => setDuration(value)} disabled={active} className={`rounded-md border px-4 py-2 text-sm ${duration === value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}`}>{value}초</button>)}</div></fieldset><label className="grid max-w-44 gap-2 text-sm font-medium">BPM <input inputMode="numeric" value={bpm} onChange={(event) => setBpm(event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="자동" className="rounded-lg border bg-background px-3 py-2 text-sm" /></label></div>
    <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => void generate()} disabled={submitting || active || !prompt.trim()} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{active ? '생성 진행 중' : '노래 만들기'}</button>{active && <button onClick={() => void cancel()} disabled={submitting} className="inline-flex items-center gap-2 rounded-md border px-5 py-3 font-semibold text-destructive disabled:opacity-50"><Square className="size-4 fill-current" />생성 중지</button>}</div>
    {error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {job && <div className="mt-6 rounded-xl border bg-muted/30 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{statusLabel[job.status] ?? `현재 상태: ${job.status}`}</p><p className="mt-1 text-xs text-muted-foreground">대기 {formatMs(job.delayTimeMs)} · GPU 실행 {formatMs(job.executionTimeMs)} · {job.durationSec ?? duration}초 출력</p></div><span className="rounded-full border bg-background px-3 py-1 text-xs font-medium">{job.model}</span></div>{job.audioUrl && <div className="mt-4"><audio controls className="w-full" src={job.audioUrl} /><a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary" href={job.audioUrl} download="playlab-ace-step.mp3"><Download className="size-4" />MP3 다운로드</a></div>}</div>}
  </section>;
}
