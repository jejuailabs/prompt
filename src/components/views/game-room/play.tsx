'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, Expand, Heart, Loader2, Maximize2, Minimize2, Share2, Trash2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  const [gameSrcdoc, setGameSrcdoc] = useState<string | null>(null);
  const startTime = useRef(Date.now());

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', contentUrl: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: game, isLoading } = useQuery({
    queryKey: ['game-play', gameId],
    queryFn: () => api.get<GameDetailDTO>(`/api/game-room/${gameId}`),
    enabled: !!gameId,
  });

  const isLocalGame = game?.contentUrl?.startsWith('/') ?? false;
  const canManage = session && game && (session.role === 'admin' || session.id === game.ownerId);

  // For external games, fetch HTML via proxy for srcdoc rendering
  useEffect(() => {
    if (!game?.contentUrl || isLocalGame) return;
    fetch(`/api/game-room/proxy?url=${encodeURIComponent(game.contentUrl)}`)
      .then((r) => r.ok ? r.text() : null)
      .then((html) => { if (html) setGameSrcdoc(html); })
      .catch(() => undefined);
  }, [game?.contentUrl, isLocalGame]);

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

  const handleEdit = () => {
    if (!game) return;
    setEditForm({ title: game.title, description: game.description, contentUrl: game.contentUrl ?? '' });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!gameId) return;
    setSaving(true);
    try {
      await api.patch(`/api/game-room/${gameId}`, editForm);
      toast({ title: '게임이 수정되었습니다' });
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ['game-play', gameId] });
    } catch (e) {
      toast({ title: '수정 실패', description: e instanceof Error ? e.message : '오류가 발생했습니다', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!gameId) return;
    try {
      await api.del(`/api/game-room/${gameId}`);
      toast({ title: '게임이 삭제되었습니다' });
      navigate('game-room');
    } catch (e) {
      toast({ title: '삭제 실패', description: e instanceof Error ? e.message : '오류가 발생했습니다', variant: 'destructive' });
    }
    setDeleteConfirm(false);
  };

  if (isLoading) return null;
  if (!game) return <EmptyState title="Game not found" description="" />;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Back + Title + Management */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('game-room')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {t.back}
        </Button>
        <h1 className="text-xl font-bold truncate">{game.title}</h1>
        {canManage && (
          <div className="flex gap-1 ml-auto">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit2 className="h-3.5 w-3.5 mr-1" /> 수정
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> 삭제
            </Button>
          </div>
        )}
      </div>

      {/* Game + Ad Layout */}
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Game iframe */}
        <div className="flex-1">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3]">
            {game.contentUrl ? (
              isLocalGame ? (
                <iframe
                  ref={iframeRef}
                  src={game.contentUrl}
                  className="w-full h-full border-0"
                  title={game.title}
                  allow="autoplay"
                />
              ) : gameSrcdoc ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={gameSrcdoc}
                  sandbox="allow-scripts"
                  className="w-full h-full border-0"
                  title={game.title}
                  allow="autoplay"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                </div>
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                게임 콘텐츠를 불러올 수 없습니다
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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

          {game.description && (
            <Card className="mt-3 p-3">
              <p className="text-sm whitespace-pre-wrap">{game.description}</p>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-full lg:w-[300px] shrink-0 space-y-4">
          <Card className="p-4 bg-muted/30 border-dashed flex flex-col items-center justify-center min-h-[250px]">
            <p className="text-xs text-muted-foreground mb-2">{t.adLabel}</p>
            <div className="w-full h-[250px] bg-muted/50 rounded flex items-center justify-center text-muted-foreground text-sm">
              AdSense 300×250
            </div>
          </Card>
          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">추천 게임</p>
            <p className="text-xs text-muted-foreground">곧 추가됩니다</p>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>게임 수정</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="게임 제목" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            <Input placeholder="게임 URL" value={editForm.contentUrl} onChange={(e) => setEditForm({ ...editForm, contentUrl: e.target.value })} />
            <Textarea placeholder="게임 설명" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            <Button className="w-full" onClick={() => void handleSave()} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>게임 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">"{game.title}" 게임을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>취소</Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>삭제</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
