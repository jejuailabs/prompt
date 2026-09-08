'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gamepad2, Play, Sparkles } from 'lucide-react';
import type { ArtifactDTO } from '@/lib/types';
import { cn } from '@/lib/utils';

// ─── internal pieces ────────────────────────────────────────────────────────

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

/** Decorative play affordance for executable / playable media (parent handles the actual play). */
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

const CUBE_FACES: { transform: string }[] = [
  { transform: 'rotateY(0deg) translateZ(75px)' }, // front
  { transform: 'rotateY(180deg) translateZ(75px)' }, // back
  { transform: 'rotateY(90deg) translateZ(75px)' }, // right
  { transform: 'rotateY(-90deg) translateZ(75px)' }, // left
  { transform: 'rotateX(90deg) translateZ(75px)' }, // top
  { transform: 'rotateX(-90deg) translateZ(75px)' }, // bottom
];

function CubePreview({ textureUrl, alt }: { textureUrl?: string | null; alt: string }) {
  return (
    <div className="cube-scene flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-transparent to-primary/5">
      <div className="scale-[0.6] sm:scale-75">
        <div className="cube">
          {CUBE_FACES.map((face, i) => (
            <div
              key={i}
              className="cube-face bg-primary/20"
              style={{
                transform: face.transform,
                ...(textureUrl ? { backgroundImage: `url(${textureUrl})` } : null),
              }}
              aria-label={i === 0 ? alt : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoSlideshow({ artifact }: { artifact: ArtifactDTO }) {
  const frames = (artifact.metadata?.frames ?? []).filter(Boolean);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (frames.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % frames.length), 2400);
    return () => clearInterval(id);
  }, [frames.length]);

  // stale idx after artifact switch is harmless: modulo cycle + fallback below
  const src = frames[idx] ?? frames[0] ?? artifact.fileUrl ?? '';
  if (!src) return <FallbackPreview />;
  return (
    <>
      <ImgCover src={src} alt={artifact.title} kenburns />
      <PlayOverlay />
    </>
  );
}

function FallbackPreview() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <Sparkles className="size-6 opacity-60" />
    </div>
  );
}

// ─── main renderer ──────────────────────────────────────────────────────────

/**
 * Type-aware artifact preview. Parent must size it (e.g. wrap in `aspect-video`).
 * `playing` only affects executable types (game/app): switches cover → sandboxed iframe.
 */
export function PreviewRenderer({
  artifact,
  playing = false,
  className,
}: {
  artifact: ArtifactDTO;
  playing?: boolean;
  className?: string;
}) {
  const t = useTranslations('core');
  const meta = artifact.metadata ?? {};

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-muted', className)}>
      {artifact.type === 'image' && (artifact.fileUrl ? <ImgCover src={artifact.fileUrl} alt={artifact.title} /> : <FallbackPreview />)}

      {artifact.type === 'video' && <VideoSlideshow artifact={artifact} />}

      {artifact.type === '3d_asset' && <CubePreview textureUrl={meta.previewUrl ?? artifact.fileUrl} alt={artifact.title} />}

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

      {artifact.type === 'landing_page' &&
        (meta.content?.hero ? (
          <div className="h-full w-full overflow-hidden bg-card p-4 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{meta.content.hero.cta || 'PLAYLAB'}</p>
            <p className="mt-1.5 line-clamp-1 font-bold">{meta.content.hero.title}</p>
            {meta.content.hero.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{meta.content.hero.subtitle}</p>}
            <div className="mt-2 border-t pt-2">
              <p className="line-clamp-2 text-xs text-muted-foreground">{meta.content.sections?.[0]?.body ?? meta.content.footer ?? ''}</p>
            </div>
          </div>
        ) : (
          <FallbackPreview />
        ))}

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
