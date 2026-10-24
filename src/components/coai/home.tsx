'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Code2, Copy, FileText, Heart, Image as ImageIcon, MapPin, MessageCircle, Eye, Newspaper } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import type { ArtifactDTO, PromptDTO, ViewKey } from '@/lib/types';
import type { AiEvent } from '@/modules/ai-events/catalogue';
import { HOME_POSTERS } from './home-content';
import { buildHeroSlides } from './home-posters';
import { AI_EVENTS } from '@/modules/ai-events/catalogue';
import { GUIDE_SERVICES, HOME_GUIDE_IDS } from '@/modules/ai-guide/catalogue';
import { boardDef, type BoardPostDTO } from '@/modules/community-board/boards';
import type { NewsDTO } from '@/modules/coai-news/news';

const AUTO_ADVANCE_MS = 5000;

/** Longest title line in em units: Hangul ≈ 1em, Latin/digits ≈ .62em, spaces ≈ .3em. */
function titleWidth(title: string) {
  return Math.max(...title.split('\n').map((line) => [...line].reduce((sum, ch) => sum + (/\s/.test(ch) ? 0.3 : /[ㄱ-힝]/.test(ch) ? 1 : 0.62), 0)));
}

function useGo() {
  const navigate = useAppStore((s) => s.navigate);
  return (event: MouseEvent, view: ViewKey, params?: Record<string, string>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(view, params);
  };
}

function hrefFor(view: ViewKey, params?: Record<string, string>) {
  if (view === 'home') return '/';
  return `/app#${view}${params ? `?${new URLSearchParams(params)}` : ''}`;
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return locale === 'en' ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
}

// Uploads are full-size originals (often 1–3MB PNG) served with no-cache, so
// Supabase thumbnails go through the Next image optimizer (resized, cached WebP).
const STORAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/`;

function Thumb({ src, className, size }: { src: string; className: string; size: number }) {
  if (!src.startsWith(STORAGE_PREFIX)) return <img className={className} src={src} alt="" loading="lazy" />;
  return <Image className={className} src={src} alt="" width={size} height={size} />;
}

// ── hero poster carousel (§2.2) ──────────────────────────────────────────

// Photo posters are the default sample; `/?posters=clay` shows the 3D clay set for comparison.
function usePosterStyle() {
  return useSyncExternalStore(() => () => {}, () => (new URLSearchParams(window.location.search).get('posters') === 'clay' ? 'clay' : 'photo'), () => 'photo');
}

function HeroCarousel() {
  const t = useTranslations('coai');
  const go = useGo();
  const posterStyle = usePosterStyle();
  // Seeds render instantly; the live list (admin-added + auto-collected events) replaces them once loaded.
  const events = useQuery({ queryKey: ['coai-home', 'events'], queryFn: () => api.get<AiEvent[]>('/api/ai-events'), staleTime: 60_000, placeholderData: AI_EVENTS });
  const slides = buildHeroSlides(events.data);
  const slideCount = posterStyle === 'clay' ? HOME_POSTERS.length : slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(4);
  const pageCount = Math.max(1, slideCount - perView + 1);
  const viewport = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  // Card width drives the slide step; ResizeObserver also fires once on mount.
  const measure = useCallback(() => {
    const width = window.innerWidth;
    setPerView(width < 1024 ? 2 : 4);
    const card = viewport.current?.querySelector<HTMLElement>('.coai-poster');
    if (card) setStep(card.offsetWidth + (width < 768 ? 12 : 16));
  }, []);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure]);
  const current = Math.min(index, pageCount - 1);

  useEffect(() => {
    if (paused || pageCount < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % pageCount), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, pageCount]);

  const touch = useRef<number | null>(null);
  const move = (delta: number) => setIndex((i) => (Math.min(i, pageCount - 1) + delta + pageCount) % pageCount);

  return (
    <section className="coai-carousel" aria-roledescription="carousel" aria-label={t('homeAria')}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onKeyDown={(event) => { if (event.key === 'ArrowLeft') move(-1); if (event.key === 'ArrowRight') move(1); }}
      onTouchStart={(event) => { touch.current = event.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(event) => { if (touch.current !== null) { const dx = event.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1); } touch.current = null; setPaused(false); }}>
      <div className="coai-carousel-viewport" ref={viewport}>
        <div className="coai-carousel-track" style={{ transform: `translateX(-${current * step}px)` }}>
          {posterStyle === 'photo' && slides.map((poster, i) => (
            <a key={poster.id} className="coai-poster" data-style="photo" data-kind={poster.kind} data-own={poster.ownPoster || undefined} href={hrefFor('ai-events', { id: poster.eventId })} onClick={(event) => go(event, 'ai-events', { id: poster.eventId })}
              style={!poster.image && poster.surface ? { background: `linear-gradient(160deg, ${poster.surface}, #111114)` } : undefined}
              aria-roledescription="slide" aria-label={t('slide', { index: i + 1 })} tabIndex={i >= current && i < current + perView ? 0 : -1}>
              {poster.image && <img src={poster.image} alt="" loading={i < 4 ? 'eager' : 'lazy'} />}
              <span className="coai-poster-badge">{poster.badge}</span>
              <h3 style={{ '--title-chars': titleWidth(poster.title) } as CSSProperties}>{poster.title}</h3>
              <span className="coai-poster-info"><span><CalendarDays size={15} />{poster.when}</span><span><MapPin size={15} />{poster.where}</span></span>
              <span className="coai-poster-cta">{poster.cta}<ChevronRight size={16} /></span>
            </a>
          ))}
          {posterStyle === 'clay' && HOME_POSTERS.map((poster, i) => (
            <a key={poster.id} className="coai-poster" data-theme={poster.theme} href={hrefFor(poster.target.view, poster.target.params)} onClick={(event) => go(event, poster.target.view, poster.target.params)}
              aria-roledescription="slide" aria-label={t('slide', { index: i + 1 })} tabIndex={i >= current && i < current + perView ? 0 : -1}>
              <span className="coai-poster-badge">{t(poster.badgeKey)}</span>
              <h3 style={{ '--title-chars': titleWidth(poster.title) } as CSSProperties}>{poster.title}</h3>
              <p>{poster.description}</p>
              <span className="coai-poster-cta">{poster.cta}<ChevronRight size={16} /></span>
              <img src={poster.image} alt="" loading={i < 4 ? 'eager' : 'lazy'} />
            </a>
          ))}
        </div>
      </div>
      {pageCount > 1 && <>
        <button type="button" className="coai-carousel-arrow" data-dir="prev" aria-label={t('prev')} onClick={() => move(-1)}><ChevronLeft size={22} /></button>
        <button type="button" className="coai-carousel-arrow" data-dir="next" aria-label={t('next')} onClick={() => move(1)}><ChevronRight size={22} /></button>
      </>}
      {pageCount > 1 && <div className="coai-dots">{Array.from({ length: pageCount }, (_, i) => <button key={i} type="button" aria-label={t('slide', { index: i + 1 })} aria-current={i === current ? 'true' : undefined} onClick={() => setIndex(i)} />)}</div>}
    </section>
  );
}

// ── shared panel (§3 SectionPanel) ───────────────────────────────────────

function Panel({ title, view, params, children, wide }: { title: string; view: ViewKey; params?: Record<string, string>; children: ReactNode; wide?: boolean }) {
  const t = useTranslations('coai');
  const go = useGo();
  return (
    <section className={`coai-panel${wide ? ' coai-panel-wide' : ''}`}>
      <div className="coai-panel-head">
        <h2>{title}</h2>
        <a className="coai-more" href={hrefFor(view, params)} onClick={(event) => go(event, view, params)}>{t('more')}<ChevronRight size={16} /></a>
      </div>
      {children}
    </section>
  );
}

// ── latest news (AI 일정 until the news board ships) ─────────────────────

function LatestNews() {
  const t = useTranslations('coai');
  const locale = useAppStore((s) => s.locale);
  const go = useGo();
  const news = useQuery({ queryKey: ['coai-home', 'news'], queryFn: () => api.get<NewsDTO[]>('/api/news?limit=3'), staleTime: 60_000 });
  // Until staff publish news, upcoming AI 일정 fill the panel.
  const useEvents = news.isSuccess && news.data.length === 0;
  const events = useQuery({ queryKey: ['coai-home', 'events'], queryFn: () => api.get<AiEvent[]>('/api/ai-events'), staleTime: 60_000, enabled: useEvents });
  const items = [...(events.data ?? [])].sort((a, b) => (b.startsAt || b.verifiedAt || '').localeCompare(a.startsAt || a.verifiedAt || '')).slice(0, 3);
  const loading = news.isLoading || (useEvents && events.isLoading);
  const empty = !loading && !news.data?.length && items.length === 0;
  return (
    <Panel title={t('homeLatestNews')} view="news">
      {empty && <p className="coai-empty">{t('homeEmpty')}</p>}
      {news.data?.map((item) => (
        <a key={item.id} className="coai-news" href={hrefFor('news', { id: item.id })} onClick={(event) => go(event, 'news', { id: item.id })}>
          {item.imageUrl
            ? <Thumb className="coai-news-thumb" src={item.imageUrl} size={112} />
            : <span className="coai-news-thumb" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--coai-blue-strong)', background: 'var(--coai-blue-soft)' }}><Newspaper size={26} /></span>}
          <div className="coai-news-body">
            <h3 className="coai-clamp-2">{item.title}</h3>
            <p className="coai-meta coai-clamp-1">{item.summary[0]}</p>
            <div className="coai-meta coai-news-foot"><span>{formatDate(item.createdAt, locale)}</span><span><MessageCircle size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {item.commentCount}</span></div>
          </div>
        </a>
      ))}
      {useEvents && items.map((item) => (
        <a key={item.id} className="coai-news" href={hrefFor('ai-events', { id: item.id })} onClick={(event) => go(event, 'ai-events', { id: item.id })}>
          {item.posterUrl
            ? <Thumb className="coai-news-thumb" src={item.posterUrl} size={112} />
            : <span className="coai-news-thumb" aria-hidden="true" style={{ background: item.surface, color: item.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, textAlign: 'center', lineHeight: 1.15, padding: 6 }}>{item.posterLines.slice(0, 2).join(' ')}</span>}
          <div className="coai-news-body">
            <h3 className="coai-clamp-2">{item.title}</h3>
            <p className="coai-meta coai-clamp-1">{item.subtitle}</p>
            <div className="coai-meta coai-news-foot"><span>{formatDate(item.startsAt || item.verifiedAt, locale)}</span><span>{item.organizer}</span></div>
          </div>
        </a>
      ))}
    </Panel>
  );
}

// ── recommended prompts ──────────────────────────────────────────────────

function promptTone(category: string): { tone: 'blue' | 'purple' | 'green'; tag: 'work' | 'image' | 'code'; Icon: typeof FileText } {
  if (/이미지|디자인|영상|image|design|video/i.test(category)) return { tone: 'purple', tag: 'image', Icon: ImageIcon };
  if (/코딩|개발|code|dev/i.test(category)) return { tone: 'green', tag: 'code', Icon: Code2 };
  return { tone: 'blue', tag: 'work', Icon: FileText };
}

function RecommendedPrompts() {
  const t = useTranslations('coai');
  const go = useGo();
  const { data = [], isLoading } = useQuery({ queryKey: ['coai-home', 'prompts'], queryFn: () => api.get<PromptDTO[]>('/api/prompts?scope=all&sort=popular&limit=3'), staleTime: 60_000 });
  const copy = async (event: MouseEvent, prompt: PromptDTO) => {
    event.preventDefault(); event.stopPropagation();
    try { await navigator.clipboard.writeText(prompt.body); toast({ title: t('copied') }); } catch { /* clipboard blocked */ }
  };
  return (
    <Panel title={t('homeRecommendedPrompts')} view="prompt-wiki">
      {!isLoading && data.length === 0 && <p className="coai-empty">{t('homeEmpty')}</p>}
      {data.slice(0, 3).map((prompt) => {
        const { tone, tag, Icon } = promptTone(prompt.category);
        return (
          <a key={prompt.id} className="coai-prompt" href={hrefFor('prompt', { id: prompt.id })} onClick={(event) => go(event, 'prompt', { id: prompt.id })}>
            <span className="coai-icon-tile" data-tone={tone}><Icon size={26} strokeWidth={1.75} /></span>
            <div className="coai-prompt-body">
              <span className="coai-tag" data-tone={tag}>{prompt.category}</span>
              <h3 className="coai-clamp-1">{prompt.title}</h3>
              <p className="coai-meta coai-clamp-2">{prompt.body}</p>
              <div className="coai-prompt-foot">
                <div className="coai-meta-row"><span aria-label={t('likes')}><Heart size={15} />{prompt.likeCount.toLocaleString()}</span><span aria-label={t('comments')}><MessageCircle size={15} />{prompt.commentCount.toLocaleString()}</span></div>
                <button type="button" className="coai-copy" aria-label={t('copy')} onClick={(event) => void copy(event, prompt)}><Copy size={16} /></button>
              </div>
            </div>
          </a>
        );
      })}
    </Panel>
  );
}

// ── AI service guide tiles ───────────────────────────────────────────────

function GuideServices() {
  const t = useTranslations('coai');
  const go = useGo();
  const services = HOME_GUIDE_IDS.map((id) => GUIDE_SERVICES.find((service) => service.id === id)!);
  return (
    <Panel title={t('homeGuideServices')} view="ai-guide">
      <div className="coai-tools">
        {services.map((service) => (
          <a key={service.id} className="coai-tool" href={hrefFor('ai-guide', { id: service.id })} onClick={(event) => go(event, 'ai-guide', { id: service.id })} title={service.description}>
            <span className="coai-tool-logo" style={{ background: service.tile, '--brand-mark': `url(/coai/brands/${service.logo})` } as CSSProperties} aria-hidden="true" />
            <span className="coai-tool-text"><strong>{service.name}</strong><span>{service.short}</span></span>
            <ChevronRight size={14} />
          </a>
        ))}
      </div>
    </Panel>
  );
}

// ── community popular ────────────────────────────────────────────────────

const TYPE_TAG: Record<string, { tone: 'general' | 'qna' | 'tip'; ko: string; en: string }> = {
  image: { tone: 'tip', ko: '이미지', en: 'Image' },
  video: { tone: 'tip', ko: '영상', en: 'Video' },
  game: { tone: 'general', ko: '게임', en: 'Game' },
  text: { tone: 'general', ko: '글', en: 'Post' },
};

function CommunityPopular() {
  const t = useTranslations('coai');
  const locale = useAppStore((s) => s.locale);
  const go = useGo();
  const posts = useQuery({ queryKey: ['coai-home', 'board'], queryFn: () => api.get<{ posts: BoardPostDTO[] }>('/api/community/posts?sort=popular&limit=3'), staleTime: 60_000 });
  // Until members start posting, popular gallery works fill the section.
  const boardPosts = posts.data?.posts ?? [];
  const { data = [], isLoading } = useQuery({ queryKey: ['coai-home', 'community'], queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=feed&sort=popular&limit=3'), staleTime: 60_000, enabled: posts.isSuccess && boardPosts.length === 0 });
  return (
    <Panel title={t('homeCommunityPopular')} view="community" wide>
      {posts.isSuccess && boardPosts.length === 0 && !isLoading && data.length === 0 && <p className="coai-empty">{t('homeEmpty')}</p>}
      <div className="coai-posts">
        {boardPosts.map((post) => {
          const def = boardDef(post.board);
          return (
            <a key={post.id} className="coai-post" href={hrefFor('community', { id: post.id })} onClick={(event) => go(event, 'community', { id: post.id })}>
              <div className="coai-post-body">
                <span className="coai-tag" data-tone={def?.tone === 'notice' ? 'image' : def?.tone ?? 'general'}>{def?.label}</span>
                <h3 className="coai-clamp-1">{post.title}</h3>
                <p className="coai-meta coai-clamp-2">{post.excerpt}</p>
                <div className="coai-meta-row"><span aria-label={t('likes')}><Heart size={15} />{post.likeCount}</span><span aria-label={t('comments')}><MessageCircle size={15} />{post.commentCount}</span><span aria-label={t('views')}><Eye size={15} />{post.views}</span><span>{formatDate(post.createdAt, locale)}</span></div>
              </div>
            </a>
          );
        })}
        {boardPosts.length === 0 && data.slice(0, 3).map((item) => {
          const tag = TYPE_TAG[item.type] ?? { tone: 'general' as const, ko: '작품', en: 'Work' };
          const thumb = item.metadata?.previewUrl || (item.type === 'image' || item.type === 'game' ? item.fileUrl : null);
          return (
            <a key={item.id} className="coai-post" href={hrefFor('project', { id: item.id })} onClick={(event) => go(event, 'project', { id: item.id })}>
              <div className="coai-post-body">
                <span className="coai-tag" data-tone={tag.tone}>{locale === 'en' ? tag.en : tag.ko}</span>
                <h3 className="coai-clamp-1">{item.title}</h3>
                <p className="coai-meta coai-clamp-2">{item.description || item.owner?.username}</p>
                <div className="coai-meta-row"><span aria-label={t('likes')}><Heart size={15} />{item.likeCount}</span><span aria-label={t('comments')}><MessageCircle size={15} />{item.commentCount}</span><span aria-label={t('views')}><Eye size={15} />{item.views}</span><span>{formatDate(item.createdAt, locale)}</span></div>
              </div>
              {thumb ? <Thumb className="coai-post-thumb" src={thumb} size={88} /> : null}
            </a>
          );
        })}
      </div>
    </Panel>
  );
}

/** COAI home (docs/coai/03 §2): poster carousel, three section panels, community popular. */
export default function CoaiHome() {
  return (
    <div className="coai-home coai-container">
      <HeroCarousel />
      <div className="coai-panels">
        <LatestNews />
        <RecommendedPrompts />
        <GuideServices />
      </div>
      <CommunityPopular />
    </div>
  );
}
