'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, FolderOpen, Loader2, Music2, Share2, Square, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';

type MusicJob = {
  artifactId: string;
  status: string;
  audioUrl: string | null;
  alternateAudioUrl?: string | null;
  published?: boolean;
  promptId?: string | null;
  quality?: 'standard' | 'high';
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
  // Full song structure for the 3-minute default; 6-10 syllables per line per the ACE-Step guide.
  const [lyrics, setLyrics] = useState('[Verse 1]\n창문 너머 번지는 불빛\n오늘 하루 끝에 서서\n익숙한 노래 흘러나와\n너를 다시 떠올려\n\n[Pre-Chorus]\n조금만 더 달려볼까\n이 밤이 끝나기 전에\n\n[Chorus]\n우리의 밤은 노래가 되어\n별빛처럼 오래 남아\n창문을 열고 소리쳐 봐\n여름밤 드라이브\n\n[Verse 2]\n바람 속에 섞인 웃음\n멀리 보이는 바다\n아무 말 없이 걸어도\n마음은 다 알 것 같아\n\n[Chorus]\n우리의 밤은 노래가 되어\n별빛처럼 오래 남아\n창문을 열고 소리쳐 봐\n여름밤 드라이브\n\n[Bridge]\n시간이 멈춘다면\n지금 이 순간이길\n\n[Final Chorus]\n우리의 밤은 노래가 되어\n영원히 여기 남아\n창문을 열고 소리쳐 봐\n여름밤 드라이브\n\n[Outro]\n여름밤 드라이브');
  const [instrumental, setInstrumental] = useState(false);
  const [language, setLanguage] = useState('ko');
  // Full-length song by default; BPM is chosen by the model unless the user sets it.
  const [duration, setDuration] = useState(180);
  const [bpm, setBpm] = useState('');
  const [quality, setQuality] = useState<'standard' | 'high'>('standard');
  const [mode, setMode] = useState<'song' | 'cover'>('song');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRightsConfirmed, setCoverRightsConfirmed] = useState(false);
  const [job, setJob] = useState<MusicJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState<number | null>(null);
  const navigate = useAppStore((s) => s.navigate);

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
      let coverSourceUrl: string | undefined;
      if (mode === 'cover') {
        if (!coverFile) throw new Error('커버할 원곡 오디오를 선택해 주세요.');
        if (!coverRightsConfirmed) throw new Error('원곡 사용 권한 확인에 동의해 주세요.');
        if (coverFile.size > 60 * 1024 * 1024) throw new Error('커버 원곡은 60MB 이하만 업로드할 수 있습니다. MP3 또는 M4A를 권장합니다.');
        const signResponse = await fetch('/api/tools/ace-music/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: coverFile.name }) });
        const signed = await signResponse.json().catch(() => ({}));
        if (!signResponse.ok || !signed.signedUrl) throw new Error(signed.error || '커버 원곡 업로드 준비에 실패했습니다.');
        const upload = await fetch(signed.signedUrl as string, { method: 'PUT', headers: { 'Content-Type': signed.contentType || coverFile.type || 'audio/mpeg', 'x-upsert': 'false' }, body: coverFile });
        if (!upload.ok) throw new Error(`커버 원곡 업로드에 실패했습니다. (${upload.status})`);
        coverSourceUrl = signed.publicUrl as string;
      }
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
          mode,
          quality,
          coverSourceUrl,
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

  // Publishing creates a prompt-gallery entry (style + lyrics) with this song attached.
  async function publish(version: number) {
    if (!job) return;
    setPublishing(version);
    setError('');
    try {
      setJob(await request('/api/tools/ace-music', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'publish', artifactId: job.artifactId, version, title }) }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '게시하지 못했습니다.');
    } finally {
      setPublishing(null);
    }
  }

  const active = Boolean(job && !TERMINAL.has(job.status));
  function selectCover(file: File | null) {
    setCoverFile(file);
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      if (!Number.isFinite(audio.duration) || audio.duration < 10 || audio.duration > 240) {
        setError('커버 원곡은 10초~4분 길이만 지원합니다.');
        return;
      }
      setDuration(Math.round(audio.duration));
    };
    audio.onerror = () => { URL.revokeObjectURL(objectUrl); setError('오디오 길이를 읽지 못했습니다. MP3, M4A, WAV, FLAC, OGG, AAC 파일을 사용해 주세요.'); };
    audio.src = objectUrl;
  }
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="flex items-center gap-2 text-2xl font-bold"><Music2 className="size-6 text-primary" />ACE-Step 노래 생성</h2><p className="mt-1 text-sm text-muted-foreground">RTX 4090급 GPU에서 ACE-Step 1.5 XL-Turbo 8스텝으로 MP3를 생성합니다.</p></div>
      <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">XL-Turbo · 8 steps · {mode === 'cover' ? '원곡 길이 기준' : `${Math.ceil((duration / 30) * 40 * (quality === 'high' ? 2 : 1))} 크레딧`}</span>
    </div>
    <div className="mt-6 flex gap-2"><button type="button" onClick={() => setMode('song')} disabled={active} className={`rounded-md border px-4 py-2 text-sm font-semibold ${mode === 'song' ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}`}>새 노래</button><button type="button" onClick={() => setMode('cover')} disabled={active} className={`rounded-md border px-4 py-2 text-sm font-semibold ${mode === 'cover' ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}`}>커버곡</button></div>
    {mode === 'cover' && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/60 p-4"><p className="font-semibold">내가 권리를 가진 원곡으로 커버 만들기</p><p className="mt-1 text-xs leading-5 text-muted-foreground">원곡의 길이와 구조를 유지하며 편곡합니다. 업로드한 원곡 파일은 이 커버 생성에만 사용됩니다.</p><input type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/flac,audio/ogg,.mp3,.m4a,.aac,.wav,.flac,.ogg" onChange={(event) => selectCover(event.target.files?.[0] || null)} disabled={active} className="mt-3 block w-full rounded-lg border bg-background p-2 text-sm" />{coverFile && <p className="mt-2 text-xs text-muted-foreground">{coverFile.name} · {(coverFile.size / 1024 / 1024).toFixed(1)}MB · 약 {duration}초</p>}<label className="mt-3 flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={coverRightsConfirmed} onChange={(event) => setCoverRightsConfirmed(event.target.checked)} disabled={active} className="mt-0.5" />나는 이 원곡을 업로드·변형할 권리를 보유했거나 필요한 허가를 받았습니다.</label></div>}
    <label className="mt-4 grid gap-2 text-sm font-medium">{mode === 'cover' ? '편곡·보컬 변경 설명' : '스타일 설명'} <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} rows={5} className="rounded-lg border bg-background p-3 text-sm leading-6" placeholder={mode === 'cover' ? '예: 어쿠스틱 발라드로 편곡, 따뜻한 여성 보컬, 원곡의 멜로디와 구조 유지' : '예: 2000년대 K-pop 발라드, 따뜻한 여성 보컬, 피아노와 스트링, 감성적인 후렴'} /></label>
    {mode === 'song' && !instrumental && <label className="mt-4 grid gap-2 text-sm font-medium">가사 <textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} maxLength={8000} rows={8} className="rounded-lg border bg-background p-3 font-mono text-sm leading-6" placeholder="[Verse], [Chorus] 형식으로 가사를 입력하세요." /></label>}
    <div className="mt-4 grid gap-3 rounded-xl border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="grid gap-1.5 text-sm font-medium">제목 <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="예: 여름밤 드라이브 (비우면 자동)" className="rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        {mode === 'song' && <label className="grid gap-1.5 text-sm font-medium">보컬 언어 <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={instrumental} className="rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"><option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option><option value="unknown">자동 감지</option></select></label>}
        {mode === 'song' && <div className="grid gap-1.5 text-sm font-medium">종류 <div className="flex gap-1">{([[false, '보컬곡'], [true, '연주곡']] as const).map(([value, label]) => <button key={label} type="button" onClick={() => setInstrumental(value)} disabled={active} className={`rounded-md border px-3 py-2 text-sm ${instrumental === value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}`}>{label}</button>)}</div></div>}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5 text-sm font-medium">{mode === 'cover' ? '길이' : '생성 길이'} {mode === 'cover' ? <p className="py-2 text-sm font-normal text-muted-foreground">원곡 길이(10초~4분)를 따릅니다</p> : <div className="flex flex-wrap gap-1">{[30, 60, 90, 180, 240].map((value) => <button key={value} type="button" onClick={() => setDuration(value)} disabled={active} className={`rounded-md border px-3 py-2 text-sm ${duration === value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}`}>{value >= 60 ? `${value / 60}분` : `${value}초`}</button>)}</div>}</div>
        <label className="grid w-28 gap-1.5 text-sm font-medium">BPM <input inputMode="numeric" value={bpm} onChange={(event) => setBpm(event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="자동" className="rounded-lg border bg-background px-3 py-2 text-sm" /></label>
      </div>
    </div>
    <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => void generate()} disabled={submitting || active || !prompt.trim() || (mode === 'cover' && (!coverFile || !coverRightsConfirmed))} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{active ? '생성 진행 중' : mode === 'cover' ? '커버곡 만들기' : '노래 만들기'}</button>{active && <button onClick={() => void cancel()} disabled={submitting} className="inline-flex items-center gap-2 rounded-md border px-5 py-3 font-semibold text-destructive disabled:opacity-50"><Square className="size-4 fill-current" />생성 중지</button>}</div>
    {error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {job && <div className="mt-6 rounded-xl border bg-muted/30 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{statusLabel[job.status] ?? `현재 상태: ${job.status}`}</p><p className="mt-1 text-xs text-muted-foreground">대기 {formatMs(job.delayTimeMs)} · GPU 실행 {formatMs(job.executionTimeMs)} · {job.durationSec ?? duration}초 출력</p></div><span className="rounded-full border bg-background px-3 py-1 text-xs font-medium">{job.model}</span></div>{job.audioUrl && <div className="mt-4 grid gap-4">{[job.audioUrl, job.alternateAudioUrl].filter((url): url is string => Boolean(url)).map((url, index) => <div key={url}><p className="mb-1.5 text-sm font-semibold">버전 {index + 1}{job.published && index === 0 && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600">게시됨</span>}</p><audio controls className="w-full" src={url} /><div className="mt-2 flex flex-wrap items-center gap-4"><a className="inline-flex items-center gap-2 text-sm font-semibold text-primary" href={url} download={`playlab-song-${index + 1}.mp3`}><Download className="size-4" />MP3 다운로드</a>{!job.published && <button type="button" onClick={() => void publish(index + 1)} disabled={publishing !== null} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{publishing === index + 1 ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}이 버전으로 갤러리에 게시</button>}</div></div>)}<div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3 text-sm"><CheckCircle2 className="size-4 text-emerald-500" /><span>내 프로젝트에 자동 저장됨</span><button type="button" onClick={() => navigate('my-projects')} className="inline-flex items-center gap-1 font-semibold text-primary"><FolderOpen className="size-4" />내 프로젝트 열기</button>{job.published && job.promptId && <button type="button" onClick={() => navigate('prompt', { id: job.promptId! })} className="inline-flex items-center gap-1 font-semibold text-primary"><Share2 className="size-4" />프롬프트 갤러리에서 보기</button>}</div></div>}</div>}
  </section>;
}
