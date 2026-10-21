'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, Copy, Download, Film, LinkIcon, Loader2, Music, Play, Sparkles, FileText, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useAppStore } from '@/lib/store';
import { MetaPromptTool } from './meta-prompt-tool';
import { ThumbnailTool } from './thumbnail-tool';
import { SunoTool } from './suno-tool';
import { Detail2Tool } from './detail2-tool';
import { AceMusicTool } from './ace-music-tool';
import { QwenVoiceCloneTool } from './qwen-voice-clone-tool';
import { PreviewNotice, useRuntime } from '@/components/runtime-context';
import { ConverterTool } from './converter-tool';
import { TTS_DESIGN_MAX_CHARS, TTS_DESIGN_PRESETS, TTS_LANGUAGES, TTS_MAX_CHARS, TTS_STYLES, TTS_VOICES } from '@/lib/tts-voices';

function ErrorBox({ text }: { text: string }) { return text ? <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{text}</p> : null; }

type TtsJob = { artifactId: string; status: string; error: string | null; audioUrl: string | null };
const TTS_ACTIVE = new Set(['QUEUED', 'RUNNING']);
type TtsTab = 'tts' | 'design' | 'clone';
const TTS_TABS: { id: TtsTab; label: string; hint: string }[] = [
  { id: 'tts', label: '기본 목소리', hint: '준비된 9명의 목소리에서 골라 말투를 입혀요.' },
  { id: 'design', label: '목소리 디자인', hint: '원하는 목소리를 글로 설명하면 새 목소리를 만들어요.' },
  { id: 'clone', label: '내 목소리 클론', hint: '참조 음성을 올리면 그 목소리로 읽어요.' },
];

function TtsTool() {
  const [tab, setTab] = useState<TtsTab>('tts'); const [description, setDescription] = useState(TTS_DESIGN_PRESETS[0].description);
  const [text, setText] = useState('안녕하세요. COAI 바로쓰기에서 자연스러운 AI 음성을 만들어 보세요.'); const [voice, setVoice] = useState(TTS_VOICES[0].id); const [language, setLanguage] = useState('Korean'); const [style, setStyle] = useState('default');
  const [job, setJob] = useState<TtsJob | null>(null); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState('');
  const busy = submitting || (!!job && TTS_ACTIVE.has(job.status));
  async function call(init?: RequestInit, id?: string) {
    const response = await fetch(id ? `/api/tools/tts?id=${encodeURIComponent(id)}` : '/api/tools/tts', init); const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || '음성 생성에 실패했어요. 잠시 후 다시 시도해 주세요.');
    return data.data as TtsJob;
  }
  useEffect(() => {
    if (!job || !TTS_ACTIVE.has(job.status)) return;
    const timer = window.setInterval(() => { call(undefined, job.artifactId).then((next) => { setJob(next); if (next.error) setError(next.error); }).catch((caught) => setError(caught instanceof Error ? caught.message : '상태를 확인하지 못했어요.')); }, 3000);
    return () => window.clearInterval(timer);
  }, [job]);
  async function generate() {
    setSubmitting(true); setError(''); setJob(null);
    try { const next = await call({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tab === 'design' ? { mode: 'design', text, description, language } : { mode: 'tts', text, voice, language, style }) }); setJob(next); if (next.error) setError(next.error); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '음성 생성에 실패했어요.'); } finally { setSubmitting(false); }
  }
  async function cancel() { if (!job) return; try { setJob(await call({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', artifactId: job.artifactId }) })); } catch (caught) { setError(caught instanceof Error ? caught.message : '취소하지 못했어요.'); } }
  function preview() { setError(''); new Audio(`/tts-samples/${voice}.mp3`).play().catch(() => setError('미리듣기 샘플을 준비 중이에요.')); }
  const url = job?.status === 'COMPLETED' ? job.audioUrl : null;
  const progress = !job ? '' : job.status === 'RUNNING' ? '목소리를 입히는 중이에요…' : '작업 순서를 기다리는 중이에요… 첫 요청은 GPU가 켜지느라 1분 정도 걸릴 수 있어요.';
  const tabs = <div role="tablist" aria-label="음성 만들기 방식" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-b">{TTS_TABS.map(item => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => { setTab(item.id); setError(''); }} className={`-mb-px border-b-2 pb-3 text-sm ${tab === item.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}>{item.label}</button>)}</div>;
  const hint = <p className="mt-3 text-xs text-muted-foreground">{TTS_TABS.find(item => item.id === tab)?.hint}</p>;
  if (tab === 'clone') return <>{tabs}{hint}<QwenVoiceCloneTool /></>;
  return <>{tabs}{hint}<section className="tts-workspace">
    <div className="tts-input">
      <div className="flex items-center justify-between"><label htmlFor="tts-script" className="eyebrow">01 / 읽을 내용</label><span className="text-xs text-muted-foreground">{text.length.toLocaleString()} / {TTS_MAX_CHARS.toLocaleString()}</span></div>
      <textarea id="tts-script" value={text} onChange={event => setText(event.target.value)} maxLength={TTS_MAX_CHARS} rows={8} placeholder="어떤 이야기를 들려줄까요?" className="mt-4 w-full resize-y border-0 border-b bg-transparent p-0 pb-5 text-base leading-8 outline-none focus:border-primary" />
      {tab === 'tts' ? <>
        <div className="mt-7 flex items-center justify-between gap-3"><h2 className="eyebrow">02 / 목소리 선택</h2><button onClick={preview} className="quiet-link text-xs"><Play size={13} />미리듣기</button></div>
        <div className="voice-options">{TTS_VOICES.map(item => <button key={item.id} onClick={() => setVoice(item.id)} aria-pressed={voice === item.id} className={voice === item.id ? 'selected' : ''}><span>{item.id.replace('_', ' ')}</span><small>{item.label} · {item.native}</small></button>)}</div>
        <h2 className="eyebrow mt-7">03 / 말투 · 언어</h2>
        <div className="mt-3 flex flex-wrap gap-2">{TTS_STYLES.map(item => <button key={item.id} onClick={() => setStyle(item.id)} aria-pressed={style === item.id} className={`rounded-full border px-3 py-1.5 text-xs ${style === item.id ? 'border-primary text-primary' : 'text-muted-foreground'}`}>{item.label}</button>)}</div>
      </> : <>
        <div className="mt-7 flex items-center justify-between gap-3"><label htmlFor="tts-design" className="eyebrow">02 / 목소리 설명</label><span className="text-xs text-muted-foreground">{description.length} / {TTS_DESIGN_MAX_CHARS}</span></div>
        <div className="mt-3 flex flex-wrap gap-2">{TTS_DESIGN_PRESETS.map(item => <button key={item.label} onClick={() => setDescription(item.description)} aria-pressed={description === item.description} className={`rounded-full border px-3 py-1.5 text-xs ${description === item.description ? 'border-primary text-primary' : 'text-muted-foreground'}`}>{item.label}</button>)}</div>
        <textarea id="tts-design" value={description} onChange={event => setDescription(event.target.value)} maxLength={TTS_DESIGN_MAX_CHARS} rows={3} placeholder="예: 30대 여성, 차분하고 신뢰감 있는 아나운서 톤. 또박또박 천천히." className="mt-3 w-full resize-y rounded-md border bg-background p-3 text-sm leading-6 outline-none focus:border-primary" />
        <h2 className="eyebrow mt-7">03 / 언어</h2>
      </>}
      <select value={language} onChange={event => setLanguage(event.target.value)} aria-label="읽을 언어" className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm">{TTS_LANGUAGES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <button onClick={generate} disabled={busy || !text.trim() || (tab === 'design' && !description.trim())} className="ribbon-cta mt-7 w-full">{busy ? '목소리를 만들고 있어요…' : '음성 만들기'}{busy ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}</button>
      {job && TTS_ACTIVE.has(job.status) && <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{progress}</span><button onClick={cancel} className="quiet-link text-xs">취소</button></div>}
      <ErrorBox text={error} />
    </div>
    <aside className="tts-result"><p className="eyebrow">04 / LISTEN TO YOUR IDEA</p><div className="sound-sculpture" aria-hidden="true">{[12,24,42,66,100,76,46,24,44,80,110,76,38,22,50,84,56,28,16].map((h,i) => <i key={i} style={{height:h}} />)}</div>
      <h2>{url ? '당신의 목소리가 준비됐어요.' : '글이 목소리가 되는 순간.'}</h2><p>{url ? '들어보고, 내려받아 다음 작업에 사용하세요.' : '내용을 입력하고 목소리를 골라보세요. 완성된 음성이 여기에 도착해요.'}</p>
      {url && <div className="mt-6"><audio className="w-full" controls src={url} /><a download="playlab-tts.wav" href={url} className="mt-5 flex items-center justify-center gap-2 text-sm text-primary"><Download size={16} />WAV 다운로드</a></div>}
      <span className="tts-format">{tab === 'design' ? 'QWEN3-TTS VOICE DESIGN' : 'QWEN3-TTS CUSTOM VOICE'} · WAV / 24 kHz</span>
    </aside>
  </section></>;

}


function QrTool() {
  const [name, setName] = useState(''); const [address, setAddress] = useState(''); const [image, setImage] = useState(''); const [error, setError] = useState('');
  async function create() {
    setError('');
    try {
      const raw = address.trim(); const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`; new URL(url);
      setImage(await QRCode.toDataURL(url, { width: 900, margin: 2, color: { dark: '#111827', light: '#ffffff' } }));
    } catch { setError('유효한 웹 주소를 입력해 주세요.'); }
  }
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm"><h2 className="text-2xl font-bold">QR 코드 생성기</h2><p className="mt-1 text-sm text-muted-foreground">웹 주소를 QR 코드 PNG로 즉시 생성하고 내려받습니다.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={address} onChange={(event) => setAddress(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && create()} placeholder="https://example.com" className="rounded-lg border bg-background px-3 py-3 text-sm" /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="파일 이름 (선택)" className="rounded-lg border bg-background px-3 py-3 text-sm" /></div><button onClick={create} disabled={!address.trim()} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground"><Sparkles className="size-4" />QR 코드 만들기</button><ErrorBox text={error} />{image && <div className="mt-6 flex flex-col items-center rounded-xl bg-muted p-6"><img src={image} alt="생성된 QR 코드" className="size-56 rounded-lg bg-white p-2" /><a href={image} download={`${name.trim() || 'playlab-qrcode'}.png`} className="mt-4 inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-semibold"><Download className="size-4" />PNG 다운로드</a></div>}</section>;
}
function CreativePlanTool({ kind }: { kind: 'storyboard' | 'detail' | 'detail2' }) {
  const labels = kind === 'storyboard' ? ['스토리보드 제너레이터', '영상 주제를 컷별 장면·카메라·퍼스트프레임·영상 프롬프트로 분해합니다.', '영상 주제'] : [kind === 'detail2' ? '상세페이지 메이커 2' : '상세페이지 메이커', kind === 'detail2' ? '상품 정보를 12장 설득 구조와 장면별 이미지 프롬프트로 만듭니다.' : '상품 정보를 구매 전환 중심의 상세페이지 카피·섹션·이미지 프롬프트로 설계합니다.', '상품 또는 서비스명'];
  const [subject, setSubject] = useState(''); const [audience, setAudience] = useState(''); const [style, setStyle] = useState(''); const [details, setDetails] = useState(''); const [result, setResult] = useState<Record<string, unknown> | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function create() { setLoading(true); setError(''); try { const response = await fetch('/api/tools/creative-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, subject, audience, style, details }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data); } catch (caught) { setError(caught instanceof Error ? caught.message : '생성에 실패했습니다.'); } finally { setLoading(false); } }
  const rows = (result?.cuts || result?.sections) as Record<string, unknown>[] | undefined;
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm"><h2 className="text-2xl font-bold">{labels[0]}</h2><p className="mt-1 text-sm text-muted-foreground">{labels[1]}</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={`${labels[2]} *`} className="rounded-lg border bg-background px-3 py-3 text-sm" /><input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="타깃 고객·시청자" className="rounded-lg border bg-background px-3 py-3 text-sm" /></div><input value={style} onChange={(event) => setStyle(event.target.value)} placeholder="스타일·브랜드 톤·참고 무드" className="mt-3 w-full rounded-lg border bg-background px-3 py-3 text-sm" /><textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="핵심 장점, 포함할 정보, 피할 표현 등" rows={4} className="mt-3 w-full rounded-lg border bg-background p-3 text-sm" /><button onClick={create} disabled={loading || !subject.trim()} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">{loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{loading ? '기획 생성 중…' : '기획 만들기'}</button><ErrorBox text={error} />{result && <div className="mt-5 space-y-3"><Output title={kind === 'storyboard' ? '영상 콘셉트' : '핵심 포지셔닝'} value={String(result.concept || result.positioning || '')} />{rows?.map((row, index) => <div key={index} className="rounded-xl border p-4"><p className="font-semibold">{String(row.no || index + 1)}. {String(row.scene || row.title || '')}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{String(row.camera || row.copy || '')}</p><Output title={kind === 'storyboard' ? '생성 프롬프트' : '이미지 프롬프트'} value={String(row.videoPrompt || row.imagePrompt || '')} /></div>)}</div>}</section>;
}
function TranscriptTool({ autoCut = false }: { autoCut?: boolean }) {
  const [file, setFile] = useState<File | null>(null); const [result, setResult] = useState<{ text: string; srt: string; segments: { start: number; end: number; text: string }[] } | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function create() { if (!file) return; setLoading(true); setError(''); try { const body = new FormData(); body.append('file', file); const response = await fetch('/api/tools/transcribe', { method: 'POST', body }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data); } catch (caught) { setError(caught instanceof Error ? caught.message : '처리에 실패했습니다.'); } finally { setLoading(false); } }
  function downloadSrt() { if (!result) return; const url = URL.createObjectURL(new Blob([result.srt], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `${file?.name.replace(/\.[^.]+$/, '') || 'subtitles'}.srt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm"><h2 className="text-2xl font-bold">{autoCut ? '자동 컷편집' : 'SRT 자막 생성기'}</h2><p className="mt-1 text-sm text-muted-foreground">{autoCut ? '현재는 편집용 대본·장면 구간 추출을 지원합니다. 영상 자동 편집과 렌더링은 준비 중입니다.' : '오디오·영상에서 Whisper 타임코드 자막을 추출해 SRT로 다운로드합니다.'}</p><input type="file" accept="audio/*,video/*" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-5 block w-full rounded-lg border bg-background p-3 text-sm" /><p className="mt-2 text-xs text-muted-foreground">24MB 이하 파일을 지원합니다.</p><button onClick={create} disabled={loading || !file} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">{loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{loading ? '음성 분석 중…' : autoCut ? '편집 구간 만들기' : 'SRT 만들기'}</button><ErrorBox text={error} />{result && <div className="mt-5"><Output title={autoCut ? '편집용 대본' : '추출된 대본'} value={result.text} />{autoCut ? <div className="mt-3 rounded-xl border p-4"><h3 className="font-semibold">장면 구간</h3><div className="mt-3 space-y-2 text-sm">{result.segments.map((segment, index) => <p key={index} className="rounded bg-muted p-2">{segment.start.toFixed(1)}s – {segment.end.toFixed(1)}s · {segment.text}</p>)}</div></div> : <button onClick={downloadSrt} className="mt-3 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold"><Download className="size-4" />SRT 다운로드</button>}</div>}</section>;
}
function WhisperTool() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('ko');
  const [result, setResult] = useState<{ text: string; srt: string; segments: { start: number; end: number; text: string }[]; engine?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function create() {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { setError('오디오 파일은 100MB 이하로 선택해주세요.'); return; }
    setLoading(true); setError(''); setStatus('오디오 파일 업로드 중…');
    try {
      const signRes = await fetch('/api/tools/whisper/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error);

      const uploadResponse = await fetch(signData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': signData.contentType || file.type || 'audio/mpeg',
          'cache-control': 'max-age=3600',
          'x-upsert': 'false',
        },
        body: file,
      });
      if (!uploadResponse.ok) {
        const detail = await uploadResponse.text();
        let message = detail;
        try {
          const parsed = JSON.parse(detail) as { message?: string; error?: string };
          message = parsed.message || parsed.error || detail;
        } catch {
          // The storage service can return a plain-text error body.
        }
        throw new Error(`오디오 파일 업로드 실패 (${uploadResponse.status}): ${message || '스토리지 서버 오류'}`);
      }

      setStatus('GPU에서 음성 분석 중… (1~3분 소요)');
      const response = await fetch('/api/tools/whisper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: signData.publicUrl, language, fileName: file.name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '음성 인식에 실패했습니다.');
    } finally {
      setLoading(false); setStatus('');
    }
  }

  function downloadSrt() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.srt], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `${file?.name.replace(/\.[^.]+$/, '') || 'transcript'}.srt`;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function downloadTxt() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `${file?.name.replace(/\.[^.]+$/, '') || 'transcript'}.txt`;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  const langs = [
    ['ko', '한국어'], ['en', 'English'], ['ja', '日本語'], ['zh', '中文'],
  ] as const;

  return (
    <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="text-2xl font-bold">음성 텍스트 변환</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        MP3, M4A, WAV 등 오디오 파일을 업로드하면 Whisper large-v3 GPU 워커가 텍스트로 변환합니다.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {langs.map(([code, label]) => (
          <button key={code} onClick={() => setLanguage(code)}
            className={`rounded-full border px-4 py-2 text-sm ${language === code ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}`}>
            {label}
          </button>
        ))}
      </div>

      <input type="file"
        accept=".mp3,.m4a,.wav,.ogg,.flac,.aac"
        onChange={(event) => setFile(event.target.files?.[0] || null)}
        className="mt-5 block w-full rounded-lg border bg-background p-3 text-sm" />
      <p className="mt-2 text-xs text-muted-foreground">
        {file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)` : 'MP3, M4A, WAV, OGG, FLAC, AAC · 최대 100MB'}
      </p>

      <button onClick={create} disabled={loading || !file}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {loading ? (status || 'GPU에서 음성 분석 중…') : '텍스트로 변환하기'}
      </button>

      <ErrorBox text={error} />

      {result && (
        <div className="mt-5 space-y-4">
          <Output title="변환된 텍스트" value={result.text} />

          {result.segments.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="font-semibold">타임코드 구간</h3>
              <div className="mt-3 max-h-80 space-y-2 overflow-auto text-sm">
                {result.segments.map((seg, i) => (
                  <p key={i} className="rounded bg-muted p-2">
                    <span className="font-mono text-xs text-primary">{seg.start.toFixed(1)}s–{seg.end.toFixed(1)}s</span>
                    {' '}{seg.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={downloadTxt}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold">
              <Download className="size-4" /> TXT 다운로드
            </button>
            <button onClick={downloadSrt}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold">
              <Download className="size-4" /> SRT 다운로드
            </button>
          </div>

          {result.engine && (
            <p className="text-xs text-muted-foreground">엔진: {result.engine} · RunPod GPU</p>
          )}
        </div>
      )}
    </section>
  );
}

function Output({ title, value }: { title: string; value: string }) { return <div className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3><button onClick={() => navigator.clipboard.writeText(value)} className="text-sm text-primary">복사</button></div><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap font-sans text-sm leading-7 text-muted-foreground">{value}</pre></div>; }

function ToolContent({ slug }: { slug: string }) { if (slug === 'tts') return <TtsTool />; if (slug === 'metaprompt') return <MetaPromptTool />; if (slug === 'suno') return <SunoTool />; if (slug === 'ace-music') return <AceMusicTool />; if (slug === 'qr') return <QrTool />; if (slug === 'thumbnail') return <ThumbnailTool />; if (slug === 'storyboard') return <CreativePlanTool kind="storyboard" />; if (slug === 'detail') return <CreativePlanTool kind="detail" />; if (slug === 'detail2') return <Detail2Tool />; if (slug === 'converter') return <ConverterTool />; if (slug === 'whisper') return <WhisperTool />; if (slug === 'srt') return <TranscriptTool />; if (slug === 'autocut') return <TranscriptTool autoCut />; return <p className="mt-8 rounded-lg border p-5 text-muted-foreground">이 도구는 준비 중이에요. AI Tools에서 사용 가능한 도구를 선택해주세요.</p>; }

export function ToolExperience({ slug }: { slug: string }) {
  const { previewMode } = useRuntime();
  const session = useAppStore(s => s.session);
  const setLoginOpen = useAppStore(s => s.setLoginOpen);
  const local = ['qr', 'converter'].includes(slug);
  if (!local && !previewMode && !session) return <section className="mt-8 rounded-lg border p-6"><p>AI 도구를 사용하려면 로그인해주세요.</p><button className="ribbon-cta mt-4" onClick={() => setLoginOpen(true)}>로그인하고 시작하기</button></section>;
  return <>{!local && slug !== 'thumbnail' && <PreviewNotice />}<ToolContent slug={slug} /></>;
}
