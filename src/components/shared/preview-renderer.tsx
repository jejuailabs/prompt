'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gamepad2, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import type { ArtifactDTO, LandingContent } from '@/lib/types';
import { cn } from '@/lib/utils';

// ─── shared pieces ─────────────────────────────────────────────────────────

function ImgCover({ src, alt, kenburns = false }: { src: string; alt: string; kenburns?: boolean }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn('h-full w-full object-cover', kenburns && 'kenburns')}
      draggable={false}
    />
  );
}

function PlayOverlay({ label }: { label?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25">
      <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
        <Play className="size-5 translate-x-px fill-current" />
      </span>
      {label && <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">{label}</span>}
    </div>
  );
}

function FallbackPreview() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <Sparkles className="size-6 opacity-60" />
    </div>
  );
}

// ─── 3D viewer with interactive rotation ────────────────────────────────────

function ThreeDViewer({ textureUrl, alt }: { textureUrl?: string | null; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: -25, y: 35 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setRotation((r) => ({ x: r.x + dy * 0.5, y: r.y + dx * 0.5 }));
  }, []);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  // Auto-rotate when not dragging
  useEffect(() => {
    const id = setInterval(() => {
      if (!dragging.current) {
        setRotation((r) => ({ ...r, y: r.y + 0.3 }));
      }
    }, 16);
    return () => clearInterval(id);
  }, []);

  const faces = [
    { transform: `rotateY(0deg) translateZ(80px)` },
    { transform: `rotateY(180deg) translateZ(80px)` },
    { transform: `rotateY(90deg) translateZ(80px)` },
    { transform: `rotateY(-90deg) translateZ(80px)` },
    { transform: `rotateX(90deg) translateZ(80px)` },
    { transform: `rotateX(-90deg) translateZ(80px)` },
  ];

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full cursor-grab items-center justify-center bg-gradient-to-br from-primary/15 via-transparent to-primary/5 active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div style={{ perspective: '600px' }}>
        <div
          style={{
            width: '160px',
            height: '160px',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: dragging.current ? 'none' : 'transform 0.05s linear',
          }}
        >
          {faces.map((face, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '160px',
                height: '160px',
                transform: face.transform,
                backfaceVisibility: 'hidden',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                ...(textureUrl
                  ? { backgroundImage: `url(${textureUrl})` }
                  : { background: 'hsl(var(--primary) / 0.15)' }),
              }}
              aria-label={i === 0 ? alt : undefined}
            />
          ))}
        </div>
      </div>
      <div className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white/70">
        드래그하여 회전
      </div>
    </div>
  );
}

// ─── Video slideshow with controls ──────────────────────────────────────────

function VideoPlayer({ artifact }: { artifact: ArtifactDTO }) {
  const frames = (artifact.metadata?.frames ?? []).filter(Boolean);
  const duration = artifact.metadata?.duration;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const frameMs = 2800;

  useEffect(() => {
    if (paused || frames.length < 2) return;
    const tick = 50;
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += tick;
      setProgress((elapsed / frameMs) * 100);
      if (elapsed >= frameMs) {
        elapsed = 0;
        setIdx((i) => (i + 1) % frames.length);
      }
    }, tick);
    return () => clearInterval(intervalRef.current);
  }, [paused, frames.length, idx]);

  const src = frames[idx] ?? frames[0] ?? artifact.fileUrl ?? '';
  if (!src) return <FallbackPreview />;

  // Extract captions from description (format: "1. caption\n2. caption\n3. caption")
  const captions = (artifact.description ?? '').split('\n').map((l) => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  const caption = captions[idx] ?? '';

  return (
    <div className="group relative h-full w-full">
      <div className="absolute inset-0">
        {frames.map((f, i) => (
          <img
            key={f}
            src={f}
            alt=""
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
              i === idx ? 'opacity-100' : 'opacity-0',
            )}
            style={{ transform: i === idx ? 'scale(1.05)' : 'scale(1)' }}
            draggable={false}
          />
        ))}
      </div>

      {/* Caption overlay */}
      {caption && (
        <div className="absolute inset-x-0 bottom-12 flex justify-center px-4">
          <span className="rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            {caption}
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setPaused(!paused); }}
          className="flex size-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
        >
          {paused ? <Play className="size-3.5 translate-x-px fill-current" /> : <Pause className="size-3.5 fill-current" />}
        </button>
        <div className="flex-1">
          <div className="h-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white/80 transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-[10px] tabular-nums text-white/70">
          {idx + 1}/{frames.length}
        </span>
        {duration && <span className="text-[10px] tabular-nums text-white/70">{duration}</span>}
      </div>

      {/* Center play when paused */}
      {paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
            <Play className="size-6 translate-x-0.5 fill-current" />
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Landing page full renderer ─────────────────────────────────────────────

function LandingPageRenderer({ artifact, expanded = false }: { artifact: ArtifactDTO; expanded?: boolean }) {
  const content = artifact.metadata?.content as LandingContent | undefined;
  if (!content?.hero) return <FallbackPreview />;

  if (!expanded) {
    return (
      <div className="h-full w-full overflow-hidden bg-card p-4 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{content.hero.cta || 'PLAYLAB'}</p>
        <p className="mt-1.5 line-clamp-1 font-bold">{content.hero.title}</p>
        {content.hero.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{content.hero.subtitle}</p>}
        <div className="mt-2 border-t pt-2">
          <p className="line-clamp-2 text-xs text-muted-foreground">{content.sections?.[0]?.body ?? content.footer ?? ''}</p>
        </div>
      </div>
    );
  }

  // Full rendered landing page in scrollable container
  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-12 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{content.hero.title}</h1>
        {content.hero.subtitle && (
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">{content.hero.subtitle}</p>
        )}
        <button
          type="button"
          className="mt-6 inline-flex rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          {content.hero.cta}
        </button>
      </section>

      {/* Sections */}
      {content.sections?.map((section, i) => (
        <section key={i} className={cn('px-6 py-10', i % 2 === 1 && 'bg-muted/30')}>
          <h2 className="text-lg font-bold">{section.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          {section.bullets && section.bullets.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {section.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {/* FAQ */}
      {content.faq && content.faq.length > 0 && (
        <section className="px-6 py-10">
          <h2 className="mb-4 text-lg font-bold">FAQ</h2>
          <div className="space-y-4">
            {content.faq.map((item, i) => (
              <div key={i} className="rounded-lg border p-4">
                <p className="text-sm font-semibold">{item.q}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">
        {content.footer}
      </footer>
    </div>
  );
}

// ─── main renderer ──────────────────────────────────────────────────────────

export function PreviewRenderer({
  artifact,
  playing = false,
  expanded = false,
  className,
}: {
  artifact: ArtifactDTO;
  playing?: boolean;
  expanded?: boolean;
  className?: string;
}) {
  const t = useTranslations('core');
  const meta = artifact.metadata ?? {};

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-muted', className)}>
      {artifact.type === 'image' && (artifact.fileUrl ? <ImgCover src={artifact.fileUrl} alt={artifact.title} /> : <FallbackPreview />)}

      {artifact.type === 'video' && <VideoPlayer artifact={artifact} />}

      {artifact.type === '3d_asset' && <ThreeDViewer textureUrl={meta.previewUrl ?? artifact.fileUrl} alt={artifact.title} />}

      {(artifact.type === 'game' || artifact.type === 'app') &&
        (playing && artifact.contentUrl ? (
          <iframe
            src={artifact.contentUrl}
            title={artifact.title}
            sandbox="allow-scripts allow-pointer-lock"
            className="h-full w-full border-0"
          />
        ) : (
          <>
            {artifact.fileUrl ? (
              <ImgCover src={artifact.fileUrl} alt={artifact.title} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-transparent to-primary/5 text-primary">
                <Gamepad2 className="size-8 opacity-70" />
              </div>
            )}
            <PlayOverlay label={t('play')} />
          </>
        ))}

      {artifact.type === 'landing_page' && <LandingPageRenderer artifact={artifact} expanded={expanded} />}

      {artifact.type === 'text' && (
        <div className="h-full w-full overflow-hidden bg-muted/40 p-4 text-left">
          <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {meta.content?.sections?.[0]?.body || artifact.description || artifact.title}
          </p>
        </div>
      )}
    </div>
  );
}
