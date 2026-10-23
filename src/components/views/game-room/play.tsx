'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit2, Heart, Loader2, Maximize2, Minimize2, Share2, Trash2, Trophy, X,
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
import { useRuntime } from '@/components/runtime-context';
import { GameScorePanel } from './game-score-panel';
import { getLocalLittleWorld, LITTLE_WORLDS } from '@/lib/little-worlds';
import { getLocalArcadeGame } from '@/lib/bundled-arcade-games';
import GameRoomView from './index';
import { PUZZLE_GAMES } from '@/lib/puzzle-games.generated';
import { PORTABLE_GAMES } from '@/lib/portable-games.generated';
import { GameAdSpace } from './game-ad-space';
import { useGameAds } from './use-game-ads';
import styles from './play-modal.module.css';

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
  previewMode?: boolean;
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
  const localGame = getLocalLittleWorld(gameId) ?? getLocalArcadeGame(gameId);
  const { previewMode } = useRuntime();
  const isLocalPreview = previewMode;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const closing = useRef(false);
  useEffect(()=>()=>{if(closeTimer.current)clearTimeout(closeTimer.current);},[]);
  const [infoOpen,setInfoOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameSrcdoc, setGameSrcdoc] = useState<string | null>(null);
  const startTime = useRef(Date.now());

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', contentUrl: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: savedGame, isLoading, isError, refetch } = useQuery({
    queryKey: ['game-play', gameId],
    queryFn: () => api.get<GameDetailDTO>(`/api/game-room/${gameId}`),
    enabled: !!gameId,
  });

  const baseGame: GameDetailDTO | undefined = savedGame ?? localGame;
  const puzzle = PUZZLE_GAMES.find(item=>item.contentUrl===baseGame?.contentUrl);
  const game = baseGame&&puzzle?{...baseGame,title:puzzle.title,description:puzzle.description,fileUrl:puzzle.fileUrl}:baseGame;
  const isLocalGame = game?.contentUrl?.startsWith('/') ?? false;
  const trackingEnabled = Boolean(game && !game.previewMode && !isLocalPreview);
  const isLittleWorld = LITTLE_WORLDS.some((item) => item.contentUrl === game?.contentUrl);
  const isPortableGame = isLittleWorld && Boolean(game?.contentUrl?.endsWith('/index.html')||PUZZLE_GAMES.some(p=>p.contentUrl===game?.contentUrl));
  const slug = LITTLE_WORLDS.find(item=>item.contentUrl===game?.contentUrl)?.slug;
  const supportsRewardedContinuation = isPortableGame&&Boolean(PORTABLE_GAMES.find(item=>item.slug===slug)?.rewardedContinue);
  const adBusy = useGameAds({iframeRef,slug,enabled:supportsRewardedContinuation});
  const parentOrigin = typeof window === 'undefined' ? '' : encodeURIComponent(window.location.origin);

  const canManage = !isLocalPreview && session && game && game.ownerId && (session.role === 'admin' || session.id === game.ownerId);

  // For external games, fetch HTML via proxy for srcdoc rendering
  useEffect(() => {
    if (!game?.contentUrl || isLocalGame) return;
    fetch(`/api/game-room/proxy?url=${encodeURIComponent(game.contentUrl)}`)
      .then((r) => r.ok ? r.text() : null)
      .then((html) => { if (html) setGameSrcdoc(html); })
      .catch(() => undefined);
  }, [game?.contentUrl, isLocalGame]);

  useEffect(() => {
    if (!gameId || !trackingEnabled || isLittleWorld) return;
    api.post('/api/game-room/play', { artifactId: gameId }).catch(() => undefined);
    startTime.current = Date.now();
    return () => {
      const duration = Date.now() - startTime.current;
      if (duration > 3000) {
        api.post('/api/game-room/play', { artifactId: gameId, durationMs: duration }).catch(() => undefined);
      }
    };
  }, [gameId, trackingEnabled, isLittleWorld]);

  useEffect(() => {
    if (!gameId || !trackingEnabled || isLittleWorld) return;
    const timer = setTimeout(() => {
      api.post('/api/game-room/ad-impression', { artifactId: gameId, slotType: 'banner' }).catch(() => undefined);
    }, 2000);
    return () => clearTimeout(timer);
  }, [gameId, trackingEnabled, isLittleWorld]);

  const handleLike = async () => {
    if (isLocalPreview || !requireLogin() || !gameId) return;
    await api.post('/api/vote', { targetType: 'artifact', targetId: game?.id ?? gameId });
    qc.invalidateQueries({ queryKey: ['game-play', gameId] });
  };

  const toggleFullscreen = () => {
    const el = modalRef.current;
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
      await api.patch(`/api/game-room/${game?.id ?? gameId}`, editForm);
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
      await api.del(`/api/game-room/${game?.id ?? gameId}`);
      toast({ title: '게임이 삭제되었습니다' });
      navigate('game-room');
    } catch (e) {
      toast({ title: '삭제 실패', description: e instanceof Error ? e.message : '오류가 발생했습니다', variant: 'destructive' });
    }
    setDeleteConfirm(false);
  };

  const closeGame = () => {
    if(closing.current)return;closing.current=true;
    if(supportsRewardedContinuation&&iframeRef.current?.contentWindow){
      iframeRef.current.contentWindow.postMessage({type:'game-command',gameId:slug,contractVersion:1,command:'finalize'},window.location.origin);
      closeTimer.current=setTimeout(()=>navigate('game-room'),150);
    }else navigate('game-room');
  };
  const resumeAfterInfo = useRef(false);
  useEffect(()=>{
    const listen=(event:MessageEvent)=>{
      if(event.source!==iframeRef.current?.contentWindow||event.origin!==window.location.origin||event.data?.gameId!==slug||event.data?.contractVersion!==1)return;
      if(event.data.type==='game-start'||event.data.type==='game-resumed')resumeAfterInfo.current=true;
      if((event.data.type==='game-paused'&&event.data.reason!=='focus')||event.data.type==='game-finished')resumeAfterInfo.current=false;
    };
    window.addEventListener('message',listen);return()=>window.removeEventListener('message',listen);
  },[slug]);
  const infoWasPlaying = useRef(false);
  const closeInfo = () => {
    setInfoOpen(false);
    if(infoWasPlaying.current&&isPortableGame)iframeRef.current?.contentWindow?.postMessage({type:'game-command',contractVersion:1,gameId:slug,command:'resume'},window.location.origin);
    infoWasPlaying.current=false;
  };
  const showInfo = () => {
    if(infoOpen){closeInfo();return;}
    infoWasPlaying.current=resumeAfterInfo.current;
    if(isPortableGame)iframeRef.current?.contentWindow?.postMessage({type:'game-command',contractVersion:1,gameId:slug,command:'pause'},window.location.origin);
    setInfoOpen(true);
  };

  return (
    <>
      <GameRoomView />
      <Dialog open onOpenChange={open=>{if(!open)closeGame();}}>
        <DialogContent ref={modalRef} showCloseButton={false} aria-describedby={undefined}
          data-game-layout={['velvet-21','minesweeper','code-ball'].includes(slug||'')?'scroll':'stage'}
          className={styles.shell+' flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-white/15 bg-[#101010] p-0 sm:h-[calc(100dvh-48px)] sm:w-[calc(100vw-48px)] sm:max-w-[1200px] sm:rounded-2xl'}
          onOpenAutoFocus={event=>{event.preventDefault();closeRef.current?.focus();}}
          onInteractOutside={event=>event.preventDefault()}>
          <header className={styles.header}>
            <div className={styles.heading}><small>만들어보기 · 게임</small><DialogTitle>{game?.title??'게임'}</DialogTitle></div>
            <div className={styles.toolbar}>
              <Button variant="ghost" size="icon" data-game-info aria-label={infoOpen?'게임 화면으로':'게임 정보와 랭킹'} aria-pressed={infoOpen} onClick={showInfo}><Trophy className="h-4 w-4"/></Button>
              <Button variant="ghost" size="icon" data-game-fullscreen aria-label={isFullscreen?t.exitFullscreen:t.fullscreen} onClick={toggleFullscreen}>{isFullscreen?<Minimize2 className="h-4 w-4"/>:<Maximize2 className="h-4 w-4"/>}</Button>
              <Button ref={closeRef} variant="ghost" size="icon" data-game-close aria-label="게임 닫기" onClick={closeGame}><X className="h-5 w-5"/></Button>
            </div>
          </header>
          <GameAdSpace placement="top"/>
          <div className={styles.stage} data-game-stage>
            {isLoading&&!localGame?<div className={styles.loading} role="status"><Loader2 className="h-7 w-7 animate-spin"/></div>:isError&&!localGame?<EmptyState title="게임을 불러오지 못했어요." action={<Button variant="outline" onClick={()=>void refetch()}>다시 불러오기</Button>}/>:game?.contentUrl?(
              isLocalGame?<iframe ref={iframeRef} src={isLittleWorld?`${game.contentUrl}?embed=1${isPortableGame?`&parentOrigin=${parentOrigin}`:''}${previewMode?'&preview=1':''}`:game.contentUrl} className={styles.frame} title={game.title} allow="autoplay; fullscreen"/>:
              gameSrcdoc?<iframe ref={iframeRef} srcDoc={gameSrcdoc} sandbox="allow-scripts" className={styles.frame} title={game.title} allow="autoplay; fullscreen"/>:<div className={styles.loading}><Loader2 className="h-7 w-7 animate-spin"/></div>
            ):<div className={styles.loading}>게임 콘텐츠를 불러올 수 없습니다</div>}
            <section className={styles.details} hidden={!infoOpen} aria-label="게임 정보와 랭킹">
              <div className={styles.detailsHeader}><h2 className="text-sm font-semibold">게임 정보와 랭킹</h2><Button variant="outline" size="sm" onClick={closeInfo}>게임으로 돌아가기</Button></div>
              {game?.description&&<p className="mt-4 whitespace-pre-wrap">{game.description}</p>}
              <GameScorePanel key={gameId} gameId={gameId} portable={isPortableGame} slug={slug} iframeRef={iframeRef} previewMode={previewMode||Boolean(game?.previewMode)} localGame={isLocalGame}/>
              <div className={styles.detailsActions}>
                {!isLocalPreview&&game&&<Button variant="outline" size="sm" onClick={handleLike}><Heart className={`mr-1 h-4 w-4 ${game.likedByMe?'fill-primary text-primary':''}`}/>{game.likeCount}</Button>}
                <Button variant="outline" size="sm" onClick={()=>{navigator.clipboard.writeText(window.location.href);toast({title:'링크가 복사되었습니다'});}}><Share2 className="mr-1 h-4 w-4"/>{t.shareBtn}</Button>
                {canManage&&<><Button variant="outline" size="sm" onClick={handleEdit}><Edit2 className="mr-1 h-4 w-4"/>수정</Button><Button variant="destructive" size="sm" onClick={()=>setDeleteConfirm(true)}><Trash2 className="mr-1 h-4 w-4"/>삭제</Button></>}
              </div>
            </section>
            <div className={styles.busy} hidden={!adBusy} role="status"><Loader2 className="h-7 w-7 animate-spin"/><span>광고를 준비하고 있어요</span><small>완료하면 같은 판에서 이어갑니다</small></div>
          </div>
          <GameAdSpace placement="bottom"/>
        </DialogContent>
      </Dialog>

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
          <p className="text-sm text-muted-foreground">"{game?.title}" 게임을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>취소</Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>삭제</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
