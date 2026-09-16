'use client';
import { useEffect, useRef, useState } from 'react';
import { Film, Play } from 'lucide-react';
import type { ArtifactDTO } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export function ProjectCard({ project, onOpen }: { project: ArtifactDTO; onOpen: () => void }) {
  const meta = project.metadata as unknown as {
    inputImageUrl?: string; prompt?: string; aspectRatio?: string; targetDurationSec?: number;
    shots?: unknown[]; projectStatus?: string;
    render?: { status?: string; videoUrl?: string };
  };
  const videoUrl = meta.render?.videoUrl || (project.fileUrl && /\.(mp4|webm|mov)(?:[?#]|$)/i.test(project.fileUrl) ? project.fileUrl : undefined);
  const [visible, setVisible] = useState(false);
  const [failedVideoUrl, setFailedVideoUrl] = useState<string>();
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  const videoFailed = Boolean(videoUrl && videoUrl === failedVideoUrl);
  const imageFailed = Boolean(meta.inputImageUrl && meta.inputImageUrl === failedImageUrl);
  const card = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!card.current) return;
    if (!('IntersectionObserver' in window)) {
      const timer = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(card.current);
    return () => observer.disconnect();
  }, []);
  const status = meta.render?.status;
  const active = ['IN_QUEUE', 'QUEUED', 'IN_PROGRESS', 'RUNNING'].includes(status ?? '');
  const failed = ['FAILED', 'TIMED_OUT'].includes(status ?? '') || meta.projectStatus === 'failed';
  const label = status === 'CANCELLED' ? '중지됨' : failed ? '실패' : active ? '생성 중' : videoUrl ? '완료' : '편집 중';
  const image = !imageFailed ? meta.inputImageUrl : undefined;
  return <button ref={card} type="button" onClick={onOpen} className="group overflow-hidden rounded-2xl border text-left transition-colors hover:border-primary/50 hover:bg-primary/[.03]">
    <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted">
      {visible && videoUrl && !videoFailed ? <video key={videoUrl} src={videoUrl} poster={image} muted playsInline preload="metadata" aria-label={`${project.title} 영상 미리보기`} className="pointer-events-none size-full object-contain" onLoadedMetadata={e => {
        const video = e.currentTarget;
        if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(.1, video.duration / 2);
      }} onError={() => setFailedVideoUrl(videoUrl)} />
        : image ? <img src={image} loading="lazy" alt={`${project.title} 시작 이미지`} className="size-full object-contain" onError={() => setFailedImageUrl(image)} />
          : <span className="flex flex-col items-center gap-2 text-xs text-muted-foreground"><Film className="size-8" />{videoFailed ? '미리보기를 불러올 수 없습니다' : active ? '영상 생성 중' : '아직 미리보기가 없습니다'}</span>}
      <Badge variant="secondary" className="absolute right-2 top-2">{label}</Badge>
      {videoUrl && !videoFailed && <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 p-1.5 text-white"><Play className="size-4" /></span>}
    </div>
    <div className="p-4"><h3 className="line-clamp-2 font-semibold">{project.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{meta.prompt ?? project.description}</p><div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground"><span>{meta.targetDurationSec ?? 6}초</span><span>{meta.aspectRatio ?? '9:16'}</span><span>{meta.shots?.length ?? 1} 샷</span></div></div>
  </button>;
}
