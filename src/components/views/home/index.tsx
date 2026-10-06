'use client';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Gamepad2, Play } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useModules } from '@/hooks/use-session';
import type { ArtifactDTO, ArtifactType, PromptDTO } from '@/lib/types';
import { AdSlot } from '@/components/experience/ad-slot';
import { artifactEntry, promptEntries, type HomeEntry } from './content';
import styles from './home.module.css';

const COVER = '/design/streaming-v1/assets/midnight-station.png';
type Filter = '' | 'image' | 'video' | 'game' | 'prompt';
const FILTERS: { value: Filter; ko: string; en: string }[] = [
  { value: '', ko: '전체', en: 'All' }, { value: 'image', ko: '이미지', en: 'Images' },
  { value: 'prompt', ko: '프롬프트', en: 'Prompts' }, { value: 'video', ko: '영상', en: 'Films' }, { value: 'game', ko: '게임', en: 'Games' },
];
const TYPE_LABELS: Record<ArtifactType | 'prompt', [string, string]> = {
  image: ['이미지', 'Image'], video: ['영상', 'Film'], game: ['게임', 'Game'], prompt: ['프롬프트', 'Prompt'],
  audio: ['음악', 'Music'], text: ['글', 'Writing'], '3d_asset': ['3D', '3D'], app: ['앱', 'App'], landing_page: ['웹페이지', 'Website'],
};
function Cover({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span className={styles.noCover}><span>PLAYLAB / IDEAS</span><strong>{title}</strong></span>;
}
function Poster({ entry, tall, en }: { entry: HomeEntry; tall?: boolean; en: boolean }) {
  const navigate = useAppStore(s => s.navigate);
  const label = TYPE_LABELS[entry.type]?.[en ? 1 : 0] ?? entry.type;
  const open = () => navigate(entry.destination.view, entry.destination.params);
  return <article className={`${styles.card} ${tall ? styles.tall : ''}`}>
    <button className={styles.cover} onClick={open} aria-label={`${entry.title} ${en ? 'open' : '열기'}`}>
      <Cover key={entry.image ?? entry.id} src={entry.image} title={entry.title} /><span className={styles.kind}>{label}</span>
      {tall && entry.image && <span className={styles.posterTitle}><small>{entry.category || 'THE PROMPT COLLECTION'}</small><strong>{entry.title}</strong><span>{entry.by ? `BY ${entry.by}` : 'PLAYLAB'}</span></span>}
      {entry.type === 'video' && <span className={styles.play}><Play size={13} fill="currentColor" /></span>}
      {entry.type === 'game' && <span className={styles.play}><Gamepad2 size={17} /></span>}
      <span className={styles.cardArrow}><ArrowUpRight size={18} /></span>
    </button>
    <button className={styles.cardTitle} onClick={open}>{entry.title}</button>
    <div className={styles.cardMeta}><span>{entry.by ? `by ${entry.by}` : 'PLAYLAB'}</span><span>{entry.category || label}</span></div>
  </article>;
}
function Shelf({ title, description, items, tall, en, more, children }: { title: string; description: string; items: HomeEntry[]; tall?: boolean; en: boolean; more: () => void; children?: ReactNode }) {
  const id = useId();
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => { const node = rail.current; if (node) node.scrollBy({ left: node.clientWidth * .75 * direction, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); };
  return <section className={styles.shelf} aria-labelledby={id}>
    <div className={styles.shelfHead}><div><h2 id={id}>{title}</h2><p>{description}</p></div><div className={styles.shelfControls}>
      <button className={styles.more} onClick={more}>{en ? 'View all' : '모두 보기'} <ChevronRight size={13} /></button>
      {!!items.length && <><button className={styles.railButton} onClick={() => scroll(-1)} aria-label={`${title} ${en ? 'previous' : '이전 작품'}`}><ChevronLeft size={15} /></button><button className={styles.railButton} onClick={() => scroll(1)} aria-label={`${title} ${en ? 'next' : '다음 작품'}`}><ChevronRight size={15} /></button></>}
    </div></div>
    {children || <div ref={rail} className={`${styles.rail} ${tall ? styles.posterRail : ''}`}>{items.map(entry => <Poster key={entry.id} entry={entry} tall={tall} en={en} />)}</div>}
  </section>;
}
function FeedState({ loading, error, retry, en }: { loading: boolean; error: boolean; retry: () => void; en: boolean }) {
  if (loading) return <div className={styles.rail} role="status" aria-label={en ? 'Loading works' : '작품 불러오는 중'}>{[0,1,2,3,4].map(i => <div className={styles.skeleton} key={i} />)}</div>;
  if (error) return <div className={styles.empty} role="status"><p>{en ? 'We could not load the works.' : '작품을 불러오지 못했어요.'}</p><button onClick={retry}>{en ? 'Try again' : '다시 불러오기'} <ArrowRight size={14} /></button></div>;
  return <div className={styles.empty}><p>{en ? 'This collection is waiting for its first work.' : '이 컬렉션의 첫 작품을 기다리고 있어요.'}</p><span>{en ? 'Share your next experiment with PLAYLAB.' : '작은 실험도 좋아요. 다음 작품을 함께 나눠보세요.'}</span></div>;
}
export default function HomeView() {
  const navigate = useAppStore(s => s.navigate);
  const en = useAppStore(s => s.locale) === 'en';
  const { data: modules = [] } = useModules();
  const hasModule = (view: string) => modules.some(m => m.entryView === view && m.enabled && !m.adminOnly && ['active','new','beta'].includes(m.status));
  const [filter, setFilter] = useState<Filter>('');
  const [selected, setSelected] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const selectedType = filter === 'prompt' ? '' : filter;
  const collection = useQuery({ queryKey: ['home-artifacts', ''], queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=feed&sort=new&limit=24&type='), staleTime: 30_000 });
  const feed = useQuery({ queryKey: ['home-artifacts', selectedType], queryFn: () => api.get<ArtifactDTO[]>(`/api/artifacts?scope=feed&sort=new&limit=24&type=${selectedType}`), staleTime: 30_000 });
  const prompts = useQuery({ queryKey: ['home-prompts'], queryFn: () => api.get<PromptDTO[]>('/api/prompts?sort=popular&limit=12'), enabled: hasModule('prompt-wiki'), staleTime: 30_000 });
  const games = useQuery({ queryKey: ['home-games'], queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=feed&sort=popular&type=game&limit=12'), enabled: hasModule('game-room'), staleTime: 30_000 });
  const works = (feed.data ?? []).map(artifactEntry);
  const promptWorks = promptEntries(prompts.data ?? [], collection.data ?? []);
  const gameWorks = (games.data ?? []).map(artifactEntry);
  const items = filter === 'prompt' ? promptWorks : works;
  const currentFeed = filter === 'prompt' ? prompts : feed;
  const featured = (collection.data ?? []).map(artifactEntry).filter(work => work.image).slice(0, 3);
  const slide = selected % (featured.length + 1);
  const active = slide ? featured[slide - 1] : undefined;
  const move = (direction: number) => setSelected((slide + direction + featured.length + 1) % (featured.length + 1));
  const more = () => filter === 'prompt' ? navigate('prompt-wiki') : filter === 'game' ? navigate('game-room') : navigate('gallery', { tab: 'artifacts', ...(filter ? { type: filter } : {}) });
  const state = (query: { isLoading: boolean; isError: boolean; refetch: () => unknown }, entries: HomeEntry[]) => query.isLoading || query.isError || !entries.length ? <FeedState loading={query.isLoading} error={query.isError} retry={() => void query.refetch()} en={en} /> : undefined;
  return <div className={styles.home} data-home-design="poster-v1">
    <section className={styles.hero} aria-roledescription={en ? 'carousel' : '추천 작품 캐러셀'} aria-label={en ? 'Discover PLAYLAB' : 'PLAYLAB의 새로운 발견'} onTouchStart={e => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => { const start = touchStart.current; touchStart.current = null; if (!start || !e.changedTouches[0]) return; const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1); }}>
      <img key={'image:' + (active?.image || 'brand')} className={styles.heroImage} src={active?.image || COVER} alt="" fetchPriority="high" onError={e => { if (!e.currentTarget.src.endsWith(COVER)) e.currentTarget.src = COVER; }} /><div className={styles.heroShade} />
      <div className={styles.heroCopy} key={'copy:' + (active?.id || 'brand')}><p className={styles.eyebrow}><b>P</b> PLAYLAB SELECTED <span>{en ? 'A NEW DISCOVERY' : '오늘의 발견'}</span></p>
        <h1>{active ? active.title : en ? <>Make something.<br />Let’s play<span>.</span></> : <>보고, 만들고,<br />같이 놀자<span>.</span></>}</h1>
        <div className={styles.heroMeta}><strong>{active ? TYPE_LABELS[active.type][en ? 1 : 0] : en ? 'A place for your next idea' : '누군가의 실험이, 다음 사람의 영감으로'}</strong>{active?.by && <span>by {active.by}</span>}</div>
        <p className={styles.heroDescription}>{active?.description || (en ? 'Images that stop you scrolling. Games worth one more try. Discover what people are making, and make your next idea real.' : '눈길을 끄는 이미지부터, 한 판 더 하고 싶은 게임까지. 사람들이 만든 세계를 둘러보고, 당신의 다음 장면을 시작하세요.')}</p>
        <div className={styles.heroActions}><button className={styles.primaryButton} onClick={() => active ? navigate(active.destination.view, active.destination.params) : navigate('gallery', { tab: 'artifacts' })}>{active?.type === 'game' || active?.type === 'video' ? <Play size={17} fill="currentColor" /> : <ArrowRight size={18} />}{active ? en ? 'Open this work' : '작품 살펴보기' : en ? 'Explore works' : '작품 둘러보기'}</button><button className={styles.secondaryButton} onClick={() => navigate('vibe-setup')}>{en ? 'Start creating' : '나도 만들어보기'} <ArrowUpRight size={16} /></button></div>
      </div>
      <div className={styles.heroBottom}><button className={styles.scrollHint} onClick={() => document.getElementById('home-discover')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}><span /> MAKE SOMETHING. START SOMETHING. <ArrowDown size={13} /></button><div className={styles.slideControls}><button onClick={() => move(-1)} aria-label={en ? 'Previous featured work' : '이전 추천 작품'} disabled={!featured.length}><ChevronLeft size={17} /></button>{[undefined, ...featured].map((entry, index) => <button key={entry?.id || 'brand'} className={`${styles.slideDot} ${slide === index ? styles.activeDot : ''}`} onClick={() => setSelected(index)} aria-label={`${en ? 'Featured' : '추천 화면'} ${index + 1}`} aria-pressed={slide === index} />)}<span><b>{String(slide + 1).padStart(2, '0')}</b> / {String(featured.length + 1).padStart(2, '0')}</span><button onClick={() => move(1)} aria-label={en ? 'Next featured work' : '다음 추천 작품'} disabled={!featured.length}><ChevronRight size={17} /></button></div></div>
    </section>
    <div id="home-discover" className={styles.filters} aria-label={en ? 'Work categories' : '작품 종류'}>{FILTERS.filter(item => item.value !== 'prompt' || hasModule('prompt-wiki')).filter(item => item.value !== 'game' || hasModule('game-room')).map(item => <button key={item.value} className={filter === item.value ? styles.activeFilter : ''} onClick={() => { setFilter(item.value); setSelected(0); }} aria-pressed={filter === item.value}>{en ? item.en : item.ko}</button>)}<span>A FEW GOOD THINGS TO GET LOST IN.</span></div>
    <Shelf title={en ? 'Worth a closer look.' : '지금, 눈여겨볼 작품들'} description={en ? 'Small experiments. Unexpected possibilities.' : '작은 실험부터 완성된 작품까지'} items={items} en={en} more={more}>{state(currentFeed, items)}</Shelf>
    {hasModule('prompt-wiki') && <Shelf title={en ? 'It started with a prompt.' : '한 장에서 시작된 아이디어'} description={en ? 'Find the image. Discover the prompt.' : '마음에 드는 결과물, 프롬프트까지 가져가세요'} items={promptWorks} tall en={en} more={() => navigate('prompt-wiki')}>{state(prompts, promptWorks)}</Shelf>}
    <div className={styles.editorialLine}><p><span>THE PLAYLAB WAY / </span>{en ? 'Every good work starts another.' : '좋은 작품은, 다음 작품의 시작이니까.'}</p><button onClick={() => navigate('academy')}>{en ? 'Explore the courses' : '영상으로 배워보기'} <ArrowUpRight size={14} /></button></div>
    {hasModule('game-room') && <Shelf title={en ? 'Your next one-more-try.' : '보기만 하기엔 아까운 게임'} description={en ? 'A click away from your next game.' : '클릭 한 번으로 게임을 시작하세요'} items={gameWorks} en={en} more={() => navigate('game-room')}>{state(games, gameWorks)}</Shelf>}
    <div className={styles.ad}><AdSlot /></div>
    <section className={styles.invitation}><div><p className={styles.eyebrow}>FROM WHAT IF TO HERE IT IS.</p><h2>{en ? 'Your next idea belongs here.' : '생각만 해둔 그거, 여기서 만들어봐.'}</h2><p>{en ? 'A small tool, a new experiment, your first creation.' : '작은 도구 하나, 새로운 실험 하나. 당신의 첫 작품을 기다려요.'}</p></div><div><button className={styles.primaryButton} onClick={() => navigate('ai-tools')}>AI Tools <ArrowUpRight size={16} /></button><button className={styles.secondaryButton} onClick={() => navigate('lab')}>{en ? 'The lab' : '실험실'} <ArrowUpRight size={16} /></button></div></section>
  </div>;
}
