'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Gamepad2, Heart, Loader2, Play, TrendingUp, Clock, Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  const t = messages[locale] ?? messages.ko;
  const session = useAppStore((s) => s.session);
  const setLoginOpen = useAppStore((s) => s.setLoginOpen);
  const qc = useQueryClient();
  const [sort, setSort] = useState<'popular' | 'recent'>('popular');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [form, setForm] = useState({ title: '', url: '', description: '', thumbnailUrl: '', tags: '', controls: '' });
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['game-room', sort],
    queryFn: () => api.get<{ games: GameDTO[] }>(`/api/game-room?sort=${sort}`),
  });

  const games = data?.games ?? [];
  const pending = useQuery({ queryKey: ['game-room', 'pending'], queryFn: () => api.get<{ games: GameDTO[] }>('/api/game-room?scope=pending'), enabled: session?.role === 'admin' });
  const submitGame = async () => {
    if (!session) { setSubmitOpen(false); setLoginOpen(true); return; }
    setSubmitting(true); setSubmitError('');
    try { await api.post('/api/game-room/submit', { ...form, tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean) }); setForm({ title: '', url: '', description: '', thumbnailUrl: '', tags: '', controls: '' }); setSubmitOpen(false); }
    catch (e) { setSubmitError(e instanceof Error ? e.message : '등록 요청에 실패했습니다.'); } finally { setSubmitting(false); }
  };
  const moderate = async (id: string, action: 'approve' | 'reject') => { await api.post(`/api/game-room/${id}/moderate`, { action }); await qc.invalidateQueries({ queryKey: ['game-room'] }); };

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
          <Button size="sm" onClick={() => setSubmitOpen(true)}><Plus className="mr-1 h-4 w-4" />게임 등록</Button>
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

      {session?.role === 'admin' && (pending.data?.games.length ?? 0) > 0 && <Card className="p-4"><h2 className="font-semibold">게임 심사 대기</h2><div className="mt-3 space-y-2">{pending.data!.games.map((game) => <div key={game.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3"><div className="min-w-0 flex-1"><p className="font-medium">{game.title}</p><a className="block truncate text-xs text-primary underline" href={game.contentUrl ?? '#'} target="_blank" rel="noreferrer">{game.contentUrl}</a></div><Button size="sm" onClick={() => void moderate(game.id, 'approve')}>승인</Button><Button size="sm" variant="destructive" onClick={() => void moderate(game.id, 'reject')}>반려</Button></div>)}</div></Card>}

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
              onClick={() => window.open(`${window.location.origin}/#game-play?id=${encodeURIComponent(game.id)}`, '_blank', 'noopener,noreferrer')}
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

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>게임 등록 요청</DialogTitle><DialogDescription>공개 HTTPS 배포 URL을 제출하면 관리자 승인 후 게임룸에 공개됩니다.</DialogDescription></DialogHeader><div className="space-y-3"><Input placeholder="게임 제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Input placeholder="게임 배포 URL (https://...)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /><Input placeholder="썸네일 URL (선택)" value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} /><Input placeholder="태그: 액션, 퍼즐, 캐주얼" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /><Textarea placeholder="게임 소개" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><Textarea placeholder="조작법 (예: 방향키 이동, 스페이스 발사)" value={form.controls} onChange={(e) => setForm({ ...form, controls: e.target.value })} />{submitError && <p className="text-sm text-destructive">{submitError}</p>}<Button className="w-full" onClick={() => void submitGame()} disabled={submitting}>{submitting ? '제출 중...' : '심사 요청하기'}</Button></div></DialogContent></Dialog>
    </div>
  );
}
