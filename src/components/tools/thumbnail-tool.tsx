'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, Copy, Download, Film, Loader2, Music2, Plus, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRuntime } from '@/components/runtime-context';
import { useAppStore } from '@/lib/store';
import { thumbnailPlanSchema, thumbnailPlanText, type ThumbnailPlan } from '@/lib/thumbnail-plan';
import styles from './thumbnail-tool.module.css';

type Mode = 'music' | 'general';
const CONTENT_TYPES = ['브이로그', '튜토리얼 / 강의', '리뷰 / 언박싱', '게임', '먹방', '여행', '뷰티 / 패션', '운동 / 헬스', '요리', '뉴스 / 시사', '동기부여', '코미디 / 엔터'];
const CHANNEL_VIBES = ['감성적인', '전문적인', '유머러스한', '미니멀한', '에너지 넘치는', '따뜻한', '세련된', '귀여운'];
const MOODS = ['궁금증 유발', '공감 자극', '이상향 제시', '충격/놀라움', '따뜻함', '긴박감', '설렘', '공포/스릴'];
const MUSIC_TARGETS = ['10-20대 여성', '20-30대 여성', '30-40대 여성', '10-20대 남성', '20-30대 남성', '30-40대 남성', '공부하는 학생', '직장인 (출퇴근)', '전체 연령'];
const PLAYLISTS = ['없음', '공부음악 시리즈', '감성음악 시리즈', '새벽음악 시리즈', '카페음악 시리즈', '드라이브 시리즈', '힐링음악 시리즈', '운동음악 시리즈'];
const MODELS = [['midjourney', 'Midjourney'], ['flux', 'Flux / SD'], ['ideogram', 'Ideogram'], ['gpt_image', 'GPT Image']] as const;

function CopyButton({ text, label = '복사' }: { text: string; label?: string }) {
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus('복사됨'); }
    catch { setStatus('복사 실패'); }
    clearTimeout(timer.current); timer.current = setTimeout(() => setStatus(''), 2200);
  }
  return <Button type="button" variant="outline" size="sm" onClick={() => void copy()} aria-live="polite">{status === '복사됨' ? <Check /> : <Copy />}{status || label}</Button>;
}

export function ThumbnailResult({ result }: { result: ThumbnailPlan }) {
  const [model, setModel] = useState<(typeof MODELS)[number][0]>('midjourney');
  const completeText = thumbnailPlanText(result);
  function download() {
    const url = URL.createObjectURL(new Blob([completeText], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'playlab-thumbnail-plan.txt'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className={styles.resultContent}>
    <div className={styles.resultActions}><CopyButton text={completeText} label="전체 복사" /><Button type="button" variant="ghost" size="sm" onClick={download}><Download />TXT 저장</Button></div>
    <section className={styles.concept}><span className={styles.eyebrow}>THE CONCEPT</span><h3>{result.analysis.concept}</h3><p>{[result.analysis.genre || result.analysis.content_type, result.analysis.emotion, result.analysis.season_time].filter(Boolean).join(' · ')}</p>{result.analysis.hook && <p>{result.analysis.hook}</p>}</section>
    <section className={styles.overlayText}><div><span>메인 문구</span><strong>{result.text_overlay.main}</strong></div><CopyButton text={result.text_overlay.main} />{result.text_overlay.sub && <p>{result.text_overlay.sub}</p>}</section>
    <div className={styles.modelTabs} role="tablist" aria-label="이미지 모델별 프롬프트">{MODELS.map(([key, label]) => <button type="button" key={key} id={`thumbnail-model-${key}`} role="tab" aria-controls={`thumbnail-prompt-${key}`} aria-selected={model === key} onClick={() => setModel(key)}>{label}</button>)}</div>
    <div role="tabpanel" id={`thumbnail-prompt-${model}`} aria-labelledby={`thumbnail-model-${model}`} className={styles.promptPanel}><div><span>이미지 생성 프롬프트</span><CopyButton text={result.prompts[model]} /></div><pre>{result.prompts[model]}</pre></div>
    <dl className={styles.analysis}>{[['시각 키워드', result.analysis.visual_keywords], ['색상 팔레트', result.analysis.color_palette], ['클릭 유도 요소', result.analysis.ctr_elements]].map(([label, items]) => <div key={String(label)}><dt>{label}</dt><dd>{(items as string[]).join(' · ') || '—'}</dd></div>)}</dl>
    <section className={styles.branding}><span>채널 브랜딩 노트</span><p>{result.branding_tip}</p></section>
  </div>;
}

export function ThumbnailTool() {
  const { previewMode } = useRuntime();
  const session = useAppStore(s => s.session);
  const setLoginOpen = useAppStore(s => s.setLoginOpen);
  const [mode, setMode] = useState<Mode>('music');
  const [music, setMusic] = useState({ title: '', stylePrompt: '', lyrics: '', target: MUSIC_TARGETS[1], playlist: PLAYLISTS[0], mainColor: '' });
  const [video, setVideo] = useState({ title: '', description: '', contentType: '', target: '', channelVibe: '', mood: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThumbnailPlan | null>(null);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const canSubmit = mode === 'music' ? Boolean(music.title.trim() && music.stylePrompt.trim() && music.lyrics.trim()) : Boolean(video.title.trim() && video.description.trim());
  const updateMusic = (key: keyof typeof music, value: string) => setMusic(previous => ({ ...previous, [key]: value }));
  const updateVideo = (key: keyof typeof video, value: string) => setVideo(previous => ({ ...previous, [key]: value }));
  function example() {
    if (mode === 'music') setMusic({ ...music, title: '새벽 세 시, 너를 생각하다', stylePrompt: 'Korean indie ballad, warm piano, soft female vocal, rainy night, 72 BPM', lyrics: '창가에 고인 작은 불빛\n잠들지 못한 마음을 비추고\n빗소리 사이로 네 이름을 불러' });
    else setVideo({ ...video, title: '제주에서 보낸 느린 하루', description: '아침 바다 산책부터 작은 골목 카페까지. 혼자 여행하며 발견한 제주 동쪽의 조용한 장소 세 곳을 소개합니다.', contentType: '여행', mood: '궁금증 유발' });
    setError('');
  }
  async function generate(event: FormEvent) {
    event.preventDefault();
    if (loading || !canSubmit || previewMode) return;
    if (!session) { setLoginOpen(true); return; }
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/tools/thumbnail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, ...(mode === 'music' ? music : video) }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '프롬프트를 만들지 못했어요. 잠시 후 다시 시도해주세요.');
      const parsed = thumbnailPlanSchema.safeParse(data);
      if (!parsed.success) throw new Error('생성 결과의 일부가 비어 있어요. 다시 생성해주세요.');
      setResult(parsed.data);
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : '연결을 확인하고 다시 시도해주세요.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }

  return <section className={styles.workspace} aria-label="썸네일 프롬프트 작업 공간">
    <form className={styles.form} onSubmit={generate}>
      <div className={styles.panelHeading}><span className={styles.eyebrow}>01 / YOUR STORY</span><button type="button" className={styles.example} onClick={example} disabled={loading}>예시 입력 <ArrowUpRight size={13} /></button></div>
      <div className={styles.modeTabs} role="group" aria-label="썸네일 종류">
        <button type="button" aria-pressed={mode === 'music'} disabled={loading} onClick={() => { setMode('music'); setResult(null); setError(''); }}><Music2 size={18} /><span><strong>음악</strong><small>플레이리스트 · 음원</small></span><i /></button>
        <button type="button" aria-pressed={mode === 'general'} disabled={loading} onClick={() => { setMode('general'); setResult(null); setError(''); }}><Film size={18} /><span><strong>영상</strong><small>브이로그 · 리뷰 · 콘텐츠</small></span><i /></button>
      </div>
      <fieldset disabled={loading} className={styles.fields}>
        <legend className={styles.srOnly}>{mode === 'music' ? '음악 정보' : '영상 정보'}</legend>
        {mode === 'music' ? <>
          <label className={styles.field}><span>음악 제목 <em>필수</em></span><input value={music.title} onChange={e => updateMusic('title', e.target.value)} placeholder="예: 새벽 세 시, 너를 생각하다" required maxLength={200} /></label>
          <label className={styles.field}><span>Suno 스타일 프롬프트 <em>필수</em></span><textarea value={music.stylePrompt} onChange={e => updateMusic('stylePrompt', e.target.value)} placeholder="장르, 악기, 보컬, 분위기를 알려주세요." rows={3} required maxLength={4000} /></label>
          <label className={styles.field}><span>가사 <em>필수</em></span><textarea value={music.lyrics} onChange={e => updateMusic('lyrics', e.target.value)} placeholder="가사를 붙여넣으면 감정과 시각적 키워드를 함께 분석해요." rows={5} required maxLength={12000} /></label>
          <details className={styles.options}><summary>듣는 사람과 채널 설정 <Plus size={15} /></summary><div className={styles.twoColumns}>
            <label className={styles.field}><span>주요 청취자</span><select value={music.target} onChange={e => updateMusic('target', e.target.value)}>{MUSIC_TARGETS.map(item => <option key={item}>{item}</option>)}</select></label>
            <label className={styles.field}><span>플레이리스트 시리즈</span><select value={music.playlist} onChange={e => updateMusic('playlist', e.target.value)}>{PLAYLISTS.map(item => <option key={item}>{item}</option>)}</select></label>
          </div><label className={styles.field}><span>채널 메인 컬러 <em>선택</em></span><input value={music.mainColor} onChange={e => updateMusic('mainColor', e.target.value)} placeholder="예: 네이비와 크림, #1a1a2e" maxLength={200} /></label></details>
        </> : <>
          <label className={styles.field}><span>영상 제목 <em>필수</em></span><input value={video.title} onChange={e => updateVideo('title', e.target.value)} placeholder="어떤 이야기를 담은 영상인가요?" required maxLength={200} /></label>
          <label className={styles.field}><span>영상 내용 / 핵심 메시지 <em>필수</em></span><textarea value={video.description} onChange={e => updateVideo('description', e.target.value)} placeholder="핵심 장면과 시청자가 궁금해할 내용을 적어주세요." rows={5} required maxLength={6000} /></label>
          <div className={styles.field}><span id="thumbnail-type-label">콘텐츠 유형 <em>선택</em></span><div className={styles.chips} role="group" aria-labelledby="thumbnail-type-label">{CONTENT_TYPES.map(item => <button type="button" key={item} aria-pressed={video.contentType === item} onClick={() => updateVideo('contentType', video.contentType === item ? '' : item)}>{item}</button>)}</div></div>
          <details className={styles.options}><summary>보는 사람과 채널 설정 <Plus size={15} /></summary><div className={styles.twoColumns}>
            <label className={styles.field}><span>주요 시청자</span><input value={video.target} onChange={e => updateVideo('target', e.target.value)} placeholder="예: 혼자 여행하는 20대" maxLength={200} /></label>
            <label className={styles.field}><span>채널 분위기</span><select value={video.channelVibe} onChange={e => updateVideo('channelVibe', e.target.value)}><option value="">자동 선택</option>{CHANNEL_VIBES.map(item => <option key={item}>{item}</option>)}</select></label>
          </div><div className={styles.field}><span id="thumbnail-mood-label">전하고 싶은 감정</span><div className={styles.chips} role="group" aria-labelledby="thumbnail-mood-label">{MOODS.map(item => <button type="button" key={item} aria-pressed={video.mood === item} onClick={() => updateVideo('mood', video.mood === item ? '' : item)}>{item}</button>)}</div></div></details>
        </>}
      </fieldset>
      <div className={styles.submitArea}>
        {previewMode && <p className={styles.previewNotice} role="status"><span />미리보기 · 입력과 옵션을 둘러볼 수 있어요. AI 생성은 서비스 연결 후 사용할 수 있어요.</p>}
        <Button type="submit" disabled={loading || !canSubmit || previewMode} className={styles.generate}>{loading ? <><Loader2 className="animate-spin" />프롬프트를 만들고 있어요…</> : <><WandSparkles />썸네일 프롬프트 만들기 <ArrowUpRight /></>}</Button>
        <p className={styles.helper}>{mode === 'music' ? '제목, 스타일 프롬프트, 가사를 입력해주세요.' : '제목과 영상 내용을 입력해주세요.'} 이미지 모델 4종의 프롬프트를 만들어요.</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </form>
    <aside className={styles.result} aria-busy={loading} aria-label="생성 결과">
      <div className={styles.panelHeading}><span className={styles.eyebrow}>02 / THE NEXT FRAME</span><span className={styles.status}>{loading ? '생성 중' : result ? '생성 완료' : '입력 대기'}</span></div>
      {result ? <ThumbnailResult result={result} /> : <div className={styles.empty}>
        <div className={styles.emptyArtwork} aria-hidden="true"><div className={styles.frameLine} /><span className={styles.frameNumber}>16 : 9</span><span className={styles.frameTitle}>Make them<br /><i>look twice.</i></span><ArrowUpRight className={styles.frameArrow} /><span className={styles.frameCaption}>YOUR NEXT THUMBNAIL</span></div>
        <h2>{loading ? '이야기에서 장면을 찾고 있어요.' : '당신의 이야기가,\n눈길을 끄는 한 장으로.'}</h2><p>{loading ? '콘셉트와 문구, 모델별 이미지 프롬프트를 정리하고 있어요.' : '정보를 입력하면 썸네일 콘셉트와 문구,\n이미지 생성 프롬프트가 여기에 나타나요.'}</p>
        <ol className={styles.deliverables}><li><span>01</span>콘셉트 · 시각 키워드</li><li><span>02</span>썸네일 메인 · 서브 문구</li><li><span>03</span>이미지 모델별 프롬프트 4종</li></ol>
        <small>이 도구는 이미지 제작에 사용할 프롬프트를 생성해요.</small>
      </div>}
    </aside>
  </section>;
}
