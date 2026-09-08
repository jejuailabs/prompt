'use client';

import { useTranslations } from 'next-intl';
import { Eye, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PreviewRenderer } from '@/components/shared/preview-renderer';
import { useAppStore } from '@/lib/store';
import type { ArtifactDTO, ArtifactType } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<ArtifactType, { ko: string; en: string }> = {
  image: { ko: '이미지', en: 'Image' },
  video: { ko: '영상', en: 'Video' },
  '3d_asset': { ko: '3D', en: '3D' },
  landing_page: { ko: '랜딩페이지', en: 'Landing' },
  game: { ko: '게임', en: 'Game' },
  app: { ko: '앱', en: 'App' },
  text: { ko: '텍스트', en: 'Text' },
};

/**
 * Feed/gallery card: preview (aspect-video) + type/category badge + duration chip +
 * gradient media overlay + body (title, @owner, likes, views).
 * Pure component: `onClick` optional — views decide navigation.
 */
export function ArtifactCard({ artifact, onClick, className }: { artifact: ArtifactDTO; onClick?: () => void; className?: string }) {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);

  const categoryLabel = artifact.metadata?.categoryLabel || TYPE_LABELS[artifact.type]?.[locale] || artifact.type;
  const duration = artifact.metadata?.duration;

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'group gap-0 overflow-hidden rounded-xl p-0 shadow-sm transition hover:ring-2 hover:ring-primary/40',
        onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        className,
      )}
    >
      {/* preview */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <PreviewRenderer artifact={artifact} className="transition-transform duration-300 group-hover:scale-[1.02]" />
        {/* fixed dark gradient (works both themes — docs/09 §9) */}
        <div className="media-overlay pointer-events-none absolute inset-x-0 bottom-0 h-16" />
        <Badge
          variant="secondary"
          className="absolute left-2 top-2 border-transparent bg-secondary/90 text-secondary-foreground backdrop-blur-sm"
        >
          {categoryLabel}
        </Badge>
        {duration && (
          <span className="absolute bottom-2.5 right-2.5 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {duration}
          </span>
        )}
      </div>

      {/* body */}
      <div className="p-4">
        <h3 className="line-clamp-1 font-medium">{artifact.title}</h3>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">@{artifact.owner?.username}</span>
          <span className="min-w-2 flex-1" />
          <Heart className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="tabular-nums">{artifact.likeCount.toLocaleString()}</span>
          <Eye className="ml-1.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="tabular-nums">{artifact.views.toLocaleString()}</span>
        </div>
      </div>
    </Card>
  );
}
