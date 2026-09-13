'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, Copy, Download, Film, Image, LinkIcon, Loader2, Music, Play, Sparkles, FileText, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useAppStore } from '@/lib/store';

const voices = ['Charon', 'Fenrir', 'Puck', 'Orus', 'Enceladus', 'Kore', 'Aoede', 'Leda', 'Zephyr', 'Callirrhoe'];
const labels: Record<string, string> = { Charon: '차분한 남성', Fenrir: '에너지 있는 남성', Puck: '친근한 남성', Orus: '설명형 남성', Enceladus: '부드러운 남성', Kore: '맑은 여성', Aoede: '따뜻한 여성', Leda: '전문적인 여성', Zephyr: '경쾌한 여성', Callirrhoe: '고급스러운 여성' };

function pcmToWav(base64: string) {
  const binary = atob(base64); const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  const pcm = new Int16Array(bytes.buffer); const buffer = new ArrayBuffer(44 + pcm.byteLength); const view = new DataView(buffer);
  const write = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + pcm.byteLength, true); write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, pcm.byteLength, true); new Int16Array(buffer, 44).set(pcm);
  return new Blob([buffer], { type: 'audio/wav' });
}
function ErrorBox({ text }: { text: string }) { return text ? <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{text}</p> : null; }

function TtsTool() {
  const [text, setText] = useState('안녕하세요. PLAYLAB AI Tools에서 자연스러운 AI 음성을 만들어 보세요.'); const [voice, setVoice] = useState('Charon'); const [url, setUrl] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  async function generate(preview = false) {
    setLoading(true); setError('');
    try { const response = await fetch('/api/tools/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: preview ? '안녕하세요. 이 음성의 분위기와 발음을 미리 들어보세요.' : text, voice }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); const next = URL.createObjectURL(pcmToWav(data.audioBase64)); if (preview) { const player = new Audio(next); player.onended = () => URL.revokeObjectURL(next); await player.play(); } else setUrl((current) => { if (current) URL.revokeObjectURL(current); return next; }); } catch (caught) { setError(caught instanceof Error ? caught.message : '음성 생성에 실패했습니다.'); } finally { setLoading(false); }
  }
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">TTS 메이커</h2><p className="mt-1 text-sm text-muted-foreground">텍스트를 Gemini 음성으로 만들고 WAV 파일로 내려받습니다.</p></div><button onClick={() => generate(true)} disabled={loading} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"><Play className="h-4 w-4" />음성 미리듣기</button></div><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={10000} rows={9} className="mt-6 w-full rounded-lg border bg-background p-4 text-sm leading-7" /><div className="mt-4 flex flex-wrap gap-2">{voices.map((item) => <button key={item} onClick={() => setVoice(item)} className={`rounded-full border px-3 py-2 text-sm ${voice === item ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}`}>{item} · {labels[item]}</button>)}</div><button onClick={() => generate()} disabled={loading || !text.trim()} className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? '생성 중…' : '음성 만들기'}</button><ErrorBox text={error} />{url && <div className="mt-5 rounded-xl bg-muted p-4"><audio className="w-full" controls src={url} /><a download="playlab-tts.wav" href={url} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Download className="h-4 w-4" />WAV 다운로드</a></div>}</section>;
}

const META_OUTPUT_OPTIONS = [
  { id: 'image', label: '이미지', icon: Image, desc: '포스터, 일러스트, 제품샷', placeholder: '예: 제주 바다가 보이는 카페에서 아이스 아메리카노를 마시는 장면, 따뜻한 오후 감성' },
  { id: 'video', label: '영상', icon: Film, desc: '쇼츠, 광고, 뮤비', placeholder: '예: 신제품 런칭 30초 숏폼, 임팩트 있는 오프닝과 CTA' },
  { id: 'report', label: '보고서', icon: FileText, desc: '분석, 리서치, IR', placeholder: '예: Q3 매출 분석 보고서, 전년 대비 성장률과 핵심 인사이트 중심' },
  { id: 'marketing', label: '마케팅', icon: Sparkles, desc: '카피, 광고, SNS', placeholder: '예: 20대 여성 타겟 인스타 카드뉴스, 친근한 톤의 뷰티 제품 소개' },
  { id: 'music', label: '음악', icon: Music, desc: '작곡, 가사, BGM', placeholder: '예: 카페에서 틀기 좋은 재즈 힙합, 몽환적이고 따뜻한 느낌' },
  { id: 'presentation', label: '기획서', icon: FileText, desc: '제안서, 발표자료', placeholder: '예: AI SaaS 사업 제안서, 시장 규모와 수익 모델 중심' },
] as const;
const META_PURPOSE: Record<string, string[]> = {
  image: ['SNS 콘텐츠', '상세페이지', '유튜브 썸네일', '브랜드 디자인'],
  video: ['유튜브 쇼츠', '제품 홍보', '교육 콘텐츠', '뮤직비디오'],
  report: ['내부 보고', '임원 보고', '투자자 IR', '시장 분석'],
  marketing: ['인스타그램', '블로그', '광고 카피', '이메일 캠페인'],
  music: ['배경음악', '광고 징글', '유튜브 BGM', '앨범 트랙'],
  presentation: ['사업 제안', '프로젝트 기획', '스타트업 피칭', '팀 보고'],
};
type MetaStep = 'type' | 'detail' | 'result';
interface MetaResult { domain: string; expertRole: string; finalPrompt: string; outputCategory: 'image' | 'video' | 'music' | 'text'; title: string }

function MetaPromptTool() {
  const navigate = useAppStore((s) => s.navigate);
  const [step, setStep] = useState<MetaStep>('type');
  const [outputType, setOutputType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [refUrl, setRefUrl] = useState('');
  const [showRef, setShowRef] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MetaResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const reset = () => { setStep('type'); setOutputType(''); setPurpose(''); setDescription(''); setRefUrl(''); setShowRef(false); setResult(null); setError(''); setCopied(false); };

  const generate = async () => {
    if (!outputType || !description.trim()) return;
    setLoading(true); setError('');
    try {
      const opt = META_OUTPUT_OPTIONS.find((o) => o.id === outputType);
      const res = await fetch('/api/tools/metaprompt-quick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outputType: opt?.label ?? outputType, purpose, description: description.trim(), referenceUrl: refUrl.trim() || undefined }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json.data); setStep('result');
    } catch (e) { setError(e instanceof Error ? e.message : '프롬프트 생성에 실패했습니다.'); }
    finally { setLoading(false); }
  };

  const copyPrompt = () => { if (!result) return; navigator.clipboard.writeText(result.finalPrompt); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const goToTool = () => {
    if (!result) return;
    copyPrompt();
    if (result.outputCategory === 'image') navigate('lab');
    else if (result.outputCategory === 'video') navigate('tool', { slug: 'storyboard' });
    else if (result.outputCategory === 'music') navigate('tool', { slug: 'suno' });
  };

  return (
    <section className="mt-10 space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {['결과물 선택', '상세 입력', '프롬프트 완성'].map((label, i) => {
          const stepIndex = step === 'type' ? 0 : step === 'detail' ? 1 : 2;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${i <= stepIndex ? 'bg-primary' : 'bg-border'}`} />}
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${i <= stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <span>{i + 1}</span> {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Output type */}
      {step === 'type' && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold">무엇을 만들고 싶으세요?</h2>
          <p className="mt-1 text-sm text-muted-foreground">결과물 유형을 선택하면 AI가 최적의 프롬프트를 만들어 드립니다</p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {META_OUTPUT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button key={opt.id} onClick={() => { setOutputType(opt.id); setStep('detail'); }}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-muted/50 p-5 text-center transition-all hover:border-primary hover:bg-primary/5">
                  <Icon className="h-8 w-8 text-primary" />
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Detail input */}
      {step === 'detail' && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('type')} className="rounded-lg border p-2 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
            <div>
              <h2 className="text-xl font-bold">{META_OUTPUT_OPTIONS.find((o) => o.id === outputType)?.label} 프롬프트 만들기</h2>
              <p className="text-sm text-muted-foreground">아래 정보를 채워주시면 AI가 전문가 수준의 프롬프트를 생성합니다</p>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="text-sm font-medium">어디에 쓸 건가요? <span className="text-xs text-muted-foreground">(선택)</span></label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(META_PURPOSE[outputType] ?? []).map((s) => (
                <button key={s} onClick={() => setPurpose(purpose === s ? '' : s)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${purpose === s ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/40'}`}>{s}</button>
              ))}
              <input value={META_PURPOSE[outputType]?.includes(purpose) ? '' : purpose} onChange={(e) => setPurpose(e.target.value)}
                placeholder="직접 입력" className="rounded-full border bg-transparent px-4 py-2 text-sm w-28 focus:w-44 transition-all focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">어떤 걸 만들고 싶은지 설명해 주세요</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={META_OUTPUT_OPTIONS.find((o) => o.id === outputType)?.placeholder}
              rows={4} className="mt-2 w-full rounded-xl border bg-background p-4 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>

          {/* Ref URL */}
          {!showRef ? (
            <button onClick={() => setShowRef(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <LinkIcon className="h-3.5 w-3.5" /> 참고 URL 추가 (선택)
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="https://..."
                className="flex-1 rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={() => { setShowRef(false); setRefUrl(''); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          )}

          <ErrorBox text={error} />

          <button onClick={generate} disabled={loading || !description.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground disabled:opacity-50">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> AI가 프롬프트를 만들고 있습니다...</> : <><Sparkles className="h-5 w-5" /> 프롬프트 생성하기</>}
          </button>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{result.domain}</span>
            <span className="text-sm text-muted-foreground">{result.expertRole}</span>
          </div>

          <div className="rounded-xl border bg-muted/30 p-5 max-h-[400px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{result.finalPrompt}</pre>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={copyPrompt}
              className="inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold hover:bg-muted transition-colors">
              <Copy className="h-4 w-4" /> {copied ? '복사됨!' : '프롬프트 복사'}
            </button>

            {result.outputCategory === 'image' && (
              <button onClick={goToTool} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                <Image className="h-4 w-4" /> 이미지 생성하러 가기 <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {result.outputCategory === 'video' && (
              <button onClick={goToTool} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                <Film className="h-4 w-4" /> 영상 기획하러 가기 <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {result.outputCategory === 'music' && (
              <button onClick={goToTool} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                <Music className="h-4 w-4" /> 음악 만들러 가기 <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <button onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold hover:bg-muted transition-colors">
              새로 만들기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SunoTool() {
  const [idea, setIdea] = useState('비 오는 제주 밤, 드라이브하며 듣는 몽환적인 시티팝'); const [result, setResult] = useState<{ title: string; genre: string; mood: string; stylePrompt: string; lyrics: string } | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function create() { setLoading(true); setError(''); try { const response = await fetch('/api/tools/suno', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data); } catch (caught) { setError(caught instanceof Error ? caught.message : '음악 프롬프트 생성에 실패했습니다.'); } finally { setLoading(false); } }
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm"><h2 className="text-2xl font-bold">Suno 뮤직 메이커</h2><p className="mt-1 text-sm text-muted-foreground">한 줄 아이디어로 Suno용 스타일 프롬프트, 제목, 완성 가사를 만듭니다.</p><textarea value={idea} onChange={(event) => setIdea(event.target.value)} rows={4} className="mt-5 w-full rounded-lg border bg-background p-4 text-sm" /><button onClick={create} disabled={loading || !idea.trim()} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? '작곡 기획 중…' : 'Suno 프롬프트 만들기'}</button><ErrorBox text={error} />{result && <div className="mt-5 grid gap-4"><div className="rounded-xl bg-muted p-4"><p className="font-bold">{result.title} <span className="ml-2 text-sm font-normal text-muted-foreground">{result.genre} · {result.mood}</span></p></div><Output title="Suno Style of Music" value={result.stylePrompt} /><Output title="Lyrics" value={result.lyrics} /></div>}</section>;
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
function ThumbnailTool() {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [audience, setAudience] = useState(''); const [mood, setMood] = useState(''); const [result, setResult] = useState<{ hook: string; overlayText: string; imagePrompt: string; composition: string; colorDirection: string; avoid: string[] } | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function create() { setLoading(true); setError(''); try { const response = await fetch('/api/tools/thumbnail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, audience, mood }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data); } catch (caught) { setError(caught instanceof Error ? caught.message : '생성에 실패했습니다.'); } finally { setLoading(false); } }
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm"><h2 className="text-2xl font-bold">유튜브 썸네일 메이커</h2><p className="mt-1 text-sm text-muted-foreground">콘텐츠 정보를 바탕으로 CTR을 고려한 문구·구도·이미지 생성 프롬프트를 만듭니다.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="영상 제목" className="rounded-lg border bg-background px-3 py-3 text-sm" /><input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="주 시청자 (선택)" className="rounded-lg border bg-background px-3 py-3 text-sm" /></div><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="영상에서 전달할 핵심 내용" rows={4} className="mt-3 w-full rounded-lg border bg-background p-3 text-sm" /><input value={mood} onChange={(event) => setMood(event.target.value)} placeholder="원하는 분위기·브랜드 컬러 (선택)" className="mt-3 w-full rounded-lg border bg-background px-3 py-3 text-sm" /><button onClick={create} disabled={loading || !title.trim() || !description.trim()} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">{loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{loading ? '분석 중…' : '썸네일 기획 만들기'}</button><ErrorBox text={error} />{result && <div className="mt-5 grid gap-3 sm:grid-cols-2"><Output title="클릭 포인트" value={`${result.hook}\n\n오버레이 문구: ${result.overlayText}\n구도: ${result.composition}\n색상: ${result.colorDirection}`} /><Output title="이미지 생성 프롬프트" value={result.imagePrompt} /><Output title="피할 요소" value={result.avoid.join(', ')} /></div>}</section>;
}
function CreativePlanTool({ kind }: { kind: 'storyboard' | 'detail' | 'detail2' }) {
  const labels = kind === 'storyboard' ? ['스토리보드 제너레이터', '영상 주제를 컷별 장면·카메라·퍼스트프레임·영상 프롬프트로 분해합니다.', '영상 주제'] : [kind === 'detail2' ? '상세페이지 메이커 2' : '상세페이지 메이커', kind === 'detail2' ? '상품 정보를 12장 설득 구조와 장면별 이미지 프롬프트로 만듭니다.' : '상품 정보를 구매 전환 중심의 상세페이지 카피·섹션·이미지 프롬프트로 설계합니다.', '상품 또는 서비스명'];
  const [subject, setSubject] = useState(''); const [audience, setAudience] = useState(''); const [style, setStyle] = useState(''); const [details, setDetails] = useState(''); const [result, setResult] = useState<Record<string, unknown> | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function create() { setLoading(true); setError(''); try { const response = await fetch('/api/tools/creative-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, subject, audience, style, details }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data); } catch (caught) { setError(caught instanceof Error ? caught.message : '생성에 실패했습니다.'); } finally { setLoading(false); } }
  const rows = (result?.cuts || result?.sections) as Record<string, unknown>[] | undefined;
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm"><h2 className="text-2xl font-bold">{labels[0]}</h2><p className="mt-1 text-sm text-muted-foreground">{labels[1]}</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={`${labels[2]} *`} className="rounded-lg border bg-background px-3 py-3 text-sm" /><input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="타깃 고객·시청자" className="rounded-lg border bg-background px-3 py-3 text-sm" /></div><input value={style} onChange={(event) => setStyle(event.target.value)} placeholder="스타일·브랜드 톤·참고 무드" className="mt-3 w-full rounded-lg border bg-background px-3 py-3 text-sm" /><textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="핵심 장점, 포함할 정보, 피할 표현 등" rows={4} className="mt-3 w-full rounded-lg border bg-background p-3 text-sm" /><button onClick={create} disabled={loading || !subject.trim()} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">{loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{loading ? '기획 생성 중…' : '기획 만들기'}</button><ErrorBox text={error} />{result && <div className="mt-5 space-y-3"><Output title={kind === 'storyboard' ? '영상 콘셉트' : '핵심 포지셔닝'} value={String(result.concept || result.positioning || '')} />{rows?.map((row, index) => <div key={index} className="rounded-xl border p-4"><p className="font-semibold">{String(row.no || index + 1)}. {String(row.scene || row.title || '')}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{String(row.camera || row.copy || '')}</p><Output title={kind === 'storyboard' ? '생성 프롬프트' : '이미지 프롬프트'} value={String(row.videoPrompt || row.imagePrompt || '')} /></div>)}</div>}</section>;
}
function ConverterTool() {
  const [mode, setMode] = useState<'image' | 'merge' | 'imagepdf'>('image'); const [files, setFiles] = useState<File[]>([]); const [quality, setQuality] = useState(82); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState('');
  function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
  async function convert() { if (!files.length) return; setBusy(true); setError(''); setDone(''); try { if (mode === 'image') { const source = files[0]; const image = new Image(); const url = URL.createObjectURL(source); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('이미지 파일을 읽을 수 없습니다.')); image.src = url; }); const max = 2000; const scale = Math.min(1, max / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height); const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality / 100)); URL.revokeObjectURL(url); if (!blob) throw new Error('이미지 변환에 실패했습니다.'); download(blob, `${source.name.replace(/\.[^.]+$/, '')}.jpg`); setDone('JPG 변환 및 다운로드를 시작했습니다.'); } else { const { PDFDocument } = await import('pdf-lib'); const output = await PDFDocument.create(); if (mode === 'merge') { for (const file of files) { const input = await PDFDocument.load(await file.arrayBuffer()); const pages = await output.copyPages(input, input.getPageIndices()); pages.forEach((page) => output.addPage(page)); } } else { for (const file of files) { const bytes = await file.arrayBuffer(); const image = file.type === 'image/png' ? await output.embedPng(bytes) : await output.embedJpg(bytes); const page = output.addPage([image.width, image.height]); page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height }); } } download(new Blob([await output.save()], { type: 'application/pdf' }), mode === 'merge' ? 'playlab-merged.pdf' : 'playlab-images.pdf'); setDone('PDF 생성 및 다운로드를 시작했습니다.'); } } catch (caught) { setError(caught instanceof Error ? caught.message : '변환에 실패했습니다.'); } finally { setBusy(false); } }
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm"><h2 className="text-2xl font-bold">무료 변환기 모음</h2><p className="mt-1 text-sm text-muted-foreground">파일은 브라우저 안에서 변환되며 서버에 업로드하지 않습니다.</p><div className="mt-5 flex flex-wrap gap-2">{([['image', '이미지 → JPG'], ['merge', 'PDF 병합'], ['imagepdf', '이미지 → PDF']] as const).map(([value, label]) => <button key={value} onClick={() => { setMode(value); setFiles([]); setDone(''); }} className={`rounded-full border px-4 py-2 text-sm ${mode === value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}`}>{label}</button>)}</div><input type="file" multiple={mode !== 'image'} accept={mode === 'merge' ? 'application/pdf' : 'image/jpeg,image/png'} onChange={(event) => setFiles(Array.from(event.target.files || []))} className="mt-5 block w-full rounded-lg border bg-background p-3 text-sm" />{mode === 'image' && <label className="mt-4 block text-sm">JPG 품질: {quality}%<input type="range" min="30" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="mt-2 block w-full" /></label>}<p className="mt-2 text-xs text-muted-foreground">{files.length ? `${files.length}개 파일 선택됨` : '파일을 선택해 주세요.'}</p><button onClick={convert} disabled={busy || !files.length} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{busy ? '변환 중…' : '변환하고 다운로드'}</button><ErrorBox text={error} />{done && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{done}</p>}</section>;
}
function TranscriptTool({ autoCut = false }: { autoCut?: boolean }) {
  const [file, setFile] = useState<File | null>(null); const [result, setResult] = useState<{ text: string; srt: string; segments: { start: number; end: number; text: string }[] } | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function create() { if (!file) return; setLoading(true); setError(''); try { const body = new FormData(); body.append('file', file); const response = await fetch('/api/tools/transcribe', { method: 'POST', body }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data); } catch (caught) { setError(caught instanceof Error ? caught.message : '처리에 실패했습니다.'); } finally { setLoading(false); } }
  function downloadSrt() { if (!result) return; const url = URL.createObjectURL(new Blob([result.srt], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `${file?.name.replace(/\.[^.]+$/, '') || 'subtitles'}.srt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
  return <section className="mt-10 rounded-2xl border bg-card p-6 shadow-sm"><h2 className="text-2xl font-bold">{autoCut ? '자동 컷편집' : 'SRT 자막 생성기'}</h2><p className="mt-1 text-sm text-muted-foreground">{autoCut ? '음성 구간을 분석해 편집용 대본과 장면 구간을 만듭니다.' : '오디오·영상에서 Whisper 타임코드 자막을 추출해 SRT로 다운로드합니다.'}</p><input type="file" accept="audio/*,video/*" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-5 block w-full rounded-lg border bg-background p-3 text-sm" /><p className="mt-2 text-xs text-muted-foreground">24MB 이하 파일을 지원합니다.</p><button onClick={create} disabled={loading || !file} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">{loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{loading ? '음성 분석 중…' : autoCut ? '편집 구간 만들기' : 'SRT 만들기'}</button><ErrorBox text={error} />{result && <div className="mt-5"><Output title={autoCut ? '편집용 대본' : '추출된 대본'} value={result.text} />{autoCut ? <div className="mt-3 rounded-xl border p-4"><h3 className="font-semibold">장면 구간</h3><div className="mt-3 space-y-2 text-sm">{result.segments.map((segment, index) => <p key={index} className="rounded bg-muted p-2">{segment.start.toFixed(1)}s – {segment.end.toFixed(1)}s · {segment.text}</p>)}</div></div> : <button onClick={downloadSrt} className="mt-3 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold"><Download className="size-4" />SRT 다운로드</button>}</div>}</section>;
}
function Output({ title, value }: { title: string; value: string }) { return <div className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3><button onClick={() => navigator.clipboard.writeText(value)} className="text-sm text-primary">복사</button></div><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap font-sans text-sm leading-7 text-muted-foreground">{value}</pre></div>; }

export function ToolExperience({ slug }: { slug: string }) { if (slug === 'tts') return <TtsTool />; if (slug === 'metaprompt') return <MetaPromptTool />; if (slug === 'suno') return <SunoTool />; if (slug === 'qr') return <QrTool />; if (slug === 'thumbnail') return <ThumbnailTool />; if (slug === 'storyboard') return <CreativePlanTool kind="storyboard" />; if (slug === 'detail') return <CreativePlanTool kind="detail" />; if (slug === 'detail2') return <CreativePlanTool kind="detail2" />; if (slug === 'converter') return <ConverterTool />; if (slug === 'srt') return <TranscriptTool />; if (slug === 'autocut') return <TranscriptTool autoCut />; return null; }
