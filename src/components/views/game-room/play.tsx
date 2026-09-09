'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Expand, Heart, Loader2, Maximize2, Minimize2, Share2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import messages from './messages';

interface GameDetailDTO {
  id: string;
  title: string;
  description: string;
  contentUrl: string | null;
  fileUrl: string | null;
  ownerName: string;
  ownerId: string;
  playCount: number;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export default function GamePlayView() {
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const params = useAppStore((s) => s.params);
  const session = useAppStore((s) => s.session);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const { toast } = useToast();
  const qc = useQueryClient();
  const t = messages[locale] ?? messages.ko;
  const gameId = params.id;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const startTime = useRef(Date.now());

  const { data: game, isLoading } = useQuery({
    queryKey: ['game-play', gameId],
    queryFn: () => api.get<GameDetailDTO>(`/api/game-room/${gameId}`),
    enabled: !!gameId,
  });

  // Record play session on mount
  useEffect(() => {
    if (!gameId) return;
    api.post('/api/game-room/play', { artifactId: gameId }).catch(() => undefined);
    startTime.current = Date.now();

    return () => {
      const duration = Date.now() - startTime.current;
      if (duration > 3000) {
        api.post('/api/game-room/play', { artifactId: gameId, durationMs: duration }).catch(() => undefined);
      }
    };
  }, [gameId]);

  // Track ad impression
  useEffect(() => {
    if (!gameId) return;
    const timer = setTimeout(() => {
      api.post('/api/game-room/ad-impression', { artifactId: gameId, slotType: 'banner' }).catch(() => undefined);
    }, 2000);
    return () => clearTimeout(timer);
  }, [gameId]);

  const handleLike = async () => {
    if (!requireLogin() || !gameId) return;
    await api.post('/api/vote', { targetType: 'artifact', targetId: gameId });
    qc.invalidateQueries({ queryKey: ['game-play', gameId] });
  };

  const toggleFullscreen = () => {
    const el = iframeRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => undefined);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => undefined);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (isLoading) return null;
  if (!game) return <EmptyState title="Game not found" description="" />;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('game-room')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {t.back}
        </Button>
        <h1 className="text-xl font-bold truncate">{game.title}</h1>
      </div>

      {/* Game + Ad Layout */}
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Game iframe */}
        <div className="flex-1">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3]">
            {game.contentUrl ? (
              <iframe
                ref={iframeRef}
                src={game.contentUrl}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-0"
                title={game.title}
                allow="autoplay"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                게임 콘텐츠를 불러올 수 없습니다
              </div>
            )}
            {/* Fullscreen toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-3">
            <Button variant="outline" size="sm" onClick={handleLike}>
              <Heart className={`mr-1 h-4 w-4 ${game.likedByMe ? 'fill-primary text-primary' : ''}`} />
              {game.likeCount}
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast({ title: '링크가 복사되었습니다' });
            }}>
              <Share2 className="mr-1 h-4 w-4" /> {t.shareBtn}
            </Button>
            <span className="text-sm text-muted-foreground ml-auto">
              {t.by} @{game.ownerName}
            </span>
          </div>

          {/* Description */}
          {game.description && (
            <Card className="mt-3 p-3">
              <p className="text-sm whitespace-pre-wrap">{game.description}</p>
            </Card>
          )}
        </div>

        {/* Right sidebar: Ad slot + more games */}
        <div className="w-full lg:w-[300px] shrink-0 space-y-4">
          {/* Ad Banner slot */}
          <Card className="p-4 bg-muted/30 border-dashed flex flex-col items-center justify-center min-h-[250px]">
            <p className="text-xs text-muted-foreground mb-2">{t.adLabel}</p>
            <div className="w-full h-[250px] bg-muted/50 rounded flex items-center justify-center text-muted-foreground text-sm">
              AdSense 300×250
            </div>
          </Card>

          {/* More games would go here */}
          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">추천 게임</p>
            <p className="text-xs text-muted-foreground">곧 추가됩니다</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
