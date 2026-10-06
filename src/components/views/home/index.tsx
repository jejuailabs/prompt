'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { artifactThumbnail } from '@/lib/artifact-media';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import type { ArtifactDTO } from '@/lib/types';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/experience/ad-slot';
import './home.css';

const MediaRibbon = dynamic(() => import('@/components/experience/media-ribbon'), { ssr: false });
const FALLBACK_IMAGES = ['/uploads/seed/thumb-fantasy.png', '/uploads/seed/frame-city-1.png', '/uploads/seed/thumb-travel-app.png', '/uploads/seed/thumb-isometric.png'];

export default function HomeView() {
  const navigate = useAppStore(s => s.navigate);
  const locale = useAppStore(s => s.locale);
  const en = locale === 'en';
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const feed = useQuery({ queryKey: ['feed', 'new'], queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=feed&sort=new&limit=12') });
  const works = feed.data ?? [];
  const images = works.filter((work, index) => work.type !== 'game' && works.findIndex(candidate => candidate.title === work.title) === index);
  const games = works.filter(work => work.type === 'game');
  const coverGame = games.find(work => Boolean(work.fileUrl)) ?? games[0];
  const featuredWorks = [coverGame, images[0], images[2], ...works]
    .filter((work): work is ArtifactDTO => Boolean(work))
    .filter((work, index, list) => list.findIndex(candidate => candidate.id === work.id) === index)
    .slice(0, 3);
  const featured = [...featuredWorks.map(work => ({ id: work.id, title: work.title, category: String(work.metadata?.categoryLabel || work.type), byline: `@${work.owner?.username}`, thumbnail: artifactThumbnail(work) || FALLBACK_IMAGES[0] })), { id: 'start-making', title: '아이디어를 작품으로', category: 'START CREATING', byline: 'PLAYLAB · 바이브코딩 시작 가이드', thumbnail: '/uploads/seed/create-cover-v4.svg' }];
  const active = featured[selected % Math.max(featured.length, 1)];
  const thumbnails = featured.map(work => work.thumbnail);
  const showcase = [games.find(work => work.contentUrl === '/games/flappy.html') ?? games[1], images[0], images[2], images[1], ...works]
    .filter((work): work is ArtifactDTO => Boolean(work))
    .filter((work, index, list) => list.findIndex(candidate => candidate.id === work.id) === index)
    .slice(0, 4);
  useEffect(() => {
    if (paused || !autoAdvance || featured.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setSelected(index => (index + 1) % featured.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, autoAdvance, featured.length]);
  const openFeatured = (index: number) => {
    const artifact = featured[index];
    if (artifact?.id === 'start-making') navigate('vibe-setup');
    else if (artifact) navigate('project', { id: artifact.id });
  };

  return <div className="ribbon-home ribbon-home--gallery">
    <section className="ribbon-hero" aria-label={en ? 'A playground for things you make' : '만든 것을 함께 즐기는 공간'}>
      <MediaRibbon images={thumbnails.length ? thumbnails : FALLBACK_IMAGES} titles={featured.map(work => work.title)} categories={featured.map(work => work.category)} paused={paused} selected={selected} onSelect={setSelected} onOpen={openFeatured} onInteract={() => setAutoAdvance(false)} />
      <div className="ribbon-topline"><span className="live-dot" /> A PLACE FOR YOUR NEXT WHAT IF.</div>
      <div className="ribbon-drag-hint">{en ? 'DRAG THE LOOP TO EXPLORE' : '띠를 좌우로 끌어 작품 탐색'} <span>↔</span></div>
      <div className="hero-floor" aria-hidden="true" />
      <div className="hero-bottom">
        <div className="hero-copy"><h1>{en ? <>Made something?<br />Let’s play<span>—</span></> : <>만들었으면,<br />같이 놀자<span>—</span></>}</h1><p>{en ? 'Small experiments. Unexpected possibilities.' : '작은 실험부터 완성한 작품까지.'}</p></div>
        <div className="hero-feature">
          {active ? <><button className="feature-image" onClick={() => openFeatured(selected)} aria-label={`${active.title} 열기`}><img src={thumbnails[selected]} alt="" /></button><div className="feature-text" key={active.id}><span className="eyebrow">ON THE LOOP / {String(selected % featured.length + 1).padStart(2, '0')}</span><h2>{active.title}</h2><p>{active.byline} <span>· {active.category}</span></p></div><button className="ribbon-cta" onClick={() => openFeatured(selected)}>{en ? 'Open & explore' : '바로 경험하기'} <ArrowUpRight size={18} /></button></> : <><span className="eyebrow">YOUR IDEAS BELONG HERE</span><h2>{en ? 'What will you make next?' : '다음에는 무엇을 만들어볼까?'}</h2><button className="ribbon-cta" onClick={() => navigate('gallery', { tab: 'artifacts' })}>{en ? 'Explore the gallery' : '작품 둘러보기'} <ArrowUpRight size={18} /></button></>}
        </div>
        <div className="hero-controls"><div><button aria-label={en ? 'Previous work' : '이전 작품'} disabled={featured.length < 2} onClick={() => setSelected((selected + featured.length - 1) % featured.length)}><ChevronLeft size={18} /></button><span><strong>{featured.length ? String(selected % featured.length + 1).padStart(2, '0') : '—'}</strong> / {String(featured.length).padStart(2, '0')}</span><button aria-label={en ? 'Next work' : '다음 작품'} disabled={featured.length < 2} onClick={() => setSelected((selected + 1) % featured.length)}><ChevronRight size={18} /></button><button onClick={() => setPaused(!paused)} aria-label={paused ? '모션 재생' : '모션 일시정지'}>{paused ? <Play size={14} /> : <Pause size={14} />}</button></div><a href="#latest-works" onClick={e => { e.preventDefault(); document.getElementById('latest-works')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}>SCROLL TO DISCOVER <ArrowDown size={14} /></a></div>
      </div>
    </section>
    <section id="latest-works" className="editorial-section home-showcase">
      <div className="section-heading"><div><p className="eyebrow">THE OPEN GALLERY</p><h2>{en ? 'Things people are making.' : '지금, 사람들이 만든 것들.'}</h2></div><button onClick={() => navigate('gallery', { tab: 'artifacts' })}>{en ? 'View all' : '더 둘러보기'} <ArrowUpRight size={17} /></button></div>
      {feed.isLoading && <div className="works-grid" aria-label="작품 불러오는 중">{[0, 1, 2, 3].map(n => <div key={n} className="work-skeleton animate-pulse" />)}</div>}
      {feed.isError && <EmptyState title={en ? 'Could not load works.' : '작품을 불러오지 못했어요.'} action={<Button variant="outline" onClick={() => void feed.refetch()}>{en ? 'Try again' : '다시 불러오기'}</Button>} />}
      {!feed.isLoading && !feed.isError && !works.length && <EmptyState title={en ? 'The first spot is yours.' : '첫 번째 자리가 비어 있어요.'} description={en ? 'Share something you made.' : '당신이 만든 작품으로 시작해보세요.'} />}
      {!!works.length && <div className="works-grid">{showcase.map(a => <button key={a.id} className="showcase-card" onClick={() => navigate('project', { id: a.id })} aria-label={`${a.title} 열기`}>
        <span className="showcase-image"><img src={artifactThumbnail(a) || FALLBACK_IMAGES[0]} alt="" />{a.type === 'video' && <span className="showcase-play"><Play size={16} fill="currentColor" /></span>}</span>
        <strong>{a.title}</strong><small>{a.description || a.metadata?.categoryLabel || a.type}</small><span className="showcase-meta"><span>@{a.owner?.username}</span><span>{a.type === 'game' ? (en ? 'GAME' : '게임') : a.type === 'image' ? (en ? 'IMAGE' : '이미지') : a.type.toUpperCase()}</span></span>
      </button>)}<div className="showcase-ad"><AdSlot /><span>광고</span></div></div>}
    </section>
    <section className="invitation-strip editorial-section"><p className="eyebrow">FROM WHAT IF TO HERE IT IS.</p><h2>{en ? <>An idea is a good start.<br />An experiment is even better.</> : <>생각만 해둔 그거,<br />여기서 한번 만들어봐.</>}</h2><div><button className="ribbon-cta" onClick={() => navigate('ai-tools')}>AI Tools <ArrowRight size={18} /></button><button className="quiet-link" onClick={() => navigate('lab')}>{en ? 'Enter the lab' : '실험실 들어가기'} <ArrowUpRight size={18} /></button></div><span className="invitation-loop" aria-hidden="true">∞</span></section>
  </div>;
}
