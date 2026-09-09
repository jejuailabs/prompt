'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gamepad2, Heart, Loader2, Play, TrendingUp, Clock } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import messages from './messages';

interface GameDTO {
  id: string;
  title: string;
  description: string;
  fileUrl: string | null;
  contentUrl: string | null;
  ownerName: string;
  playCount: number;
  likeCount: number;
  createdAt: string;
  metadata: { params?: { palette?: string }; tags?: string[] };
}

export default function GameRoomView() {
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const t = messages[locale] ?? messages.ko;
  const [sort, setSort] = useState<'popular' | 'recent'>('popular');

  const { data, isLoading } = useQuery({
    queryKey: ['game-room', sort],
    queryFn: () => api.get<{ games: GameDTO[] }>(`/api/game-room?sort=${sort}`),
  });

  const games = data?.games ?? [];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gamepad2 className="h-6 w-6" /> {t.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sort === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort('popular')}
          >
            <TrendingUp className="h-4 w-4 mr-1" /> {t.sortPopular}
          </Button>
          <Button
            variant={sort === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort('recent')}
          >
            <Clock className="h-4 w-4 mr-1" /> {t.sortRecent}
          </Button>
        </div>
      </div>

      {/* Game Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : games.length === 0 ? (
        <EmptyState title={t.empty} description="" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {games.map((game) => (
            <Card
              key={game.id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all group"
              onClick={() => navigate('game-play', { id: game.id })}
            >
              {/* Thumbnail */}
              <div className="relative aspect-[4/3] bg-gradient-to-br from-violet-600/20 to-indigo-600/20 overflow-hidden">
                {game.fileUrl ? (
                  <img
                    src={game.fileUrl}
                    alt={game.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background: game.metadata?.params?.palette
                        ? `linear-gradient(135deg, ${game.metadata.params.palette}44, ${game.metadata.params.palette})`
                        : undefined,
                    }}
                  >
                    <Gamepad2 className="h-12 w-12 text-white/60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-12 w-12 text-white fill-white" />
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{game.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {t.by} @{game.ownerName}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Play className="h-3 w-3" /> {game.playCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" /> {game.likeCount}
                  </span>
                </div>
                {game.metadata?.tags && game.metadata.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {game.metadata.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
