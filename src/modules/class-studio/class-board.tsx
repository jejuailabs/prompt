'use client';

// Class wall for /c/<code>/board — Padlet-style masonry that fills itself as students finish images.
// Built for a projector: big title, the join QR in the corner for latecomers, newest cards first.
import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import type { ClassBoardCardDTO, ClassBoardDTO } from './types';

const POLL_MS = 4000;

export function ClassBoard({ code }: { code: string }) {
  const [board, setBoard] = useState<ClassBoardDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ClassBoardCardDTO | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const next = await api.get<ClassBoardDTO>(`/api/class/${code}/board`);
      // Cards that appear after the first load get a short highlight.
      if (seen.current) {
        const added = next.cards.filter((c) => !seen.current!.has(c.id)).map((c) => c.id);
        if (added.length) setFresh(new Set(added));
      }
      seen.current = new Set(next.cards.map((c) => c.id));
      setBoard(next);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '보드를 불러오지 못했어요');
    }
  }, [code]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    void QRCode.toDataURL(`${window.location.origin}/c/${code}`, { width: 320, margin: 1 }).then(setQr);
  }, [code]);

  const joinHost = typeof window === 'undefined' ? '' : window.location.host;

  return (
    <div className="min-h-dvh bg-muted/40 text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/90 px-4 py-3 backdrop-blur sm:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold sm:text-3xl">{board?.title ?? 'COAI 수업 보드'}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {board ? `작품 ${board.cards.length}개${board.state === 'ended' ? ' · 수업 종료' : ' · 자동으로 모이는 중'}` : '불러오는 중…'}
          </p>
        </div>
        {qr && board?.state !== 'ended' && (
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right text-sm leading-tight text-muted-foreground">
              <p>QR로 참여하기</p>
              <p className="font-mono text-base font-semibold text-foreground">{joinHost}/c/{code}</p>
            </div>
            <img src={qr} alt="참여 QR" className="size-20 rounded-lg bg-white p-1" />
          </div>
        )}
      </header>

      {error && !board && <p role="alert" className="p-10 text-center text-lg text-muted-foreground">{error}</p>}
      {!board && !error && <div className="grid place-items-center p-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}
      {board && board.cards.length === 0 && (
        <p className="p-20 text-center text-xl text-muted-foreground">첫 번째 작품을 기다리는 중이에요</p>
      )}

      {board && board.cards.length > 0 && (
        <main className="columns-2 gap-3 p-3 sm:columns-3 sm:gap-4 sm:p-6 lg:columns-4 2xl:columns-5">
          {board.cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setViewing(card)}
              className={`mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-background text-left shadow-sm ring-1 ring-border transition sm:mb-4 ${fresh.has(card.id) ? 'animate-in fade-in zoom-in-95 ring-2 ring-primary duration-700' : ''}`}
            >
              <p className="truncate px-3 pb-2 pt-2.5 text-[15px] font-semibold sm:text-base">{card.nickname}</p>
              <img src={card.resultUrl} alt={card.promptText} loading="lazy" className="aspect-square w-full object-cover" />
              <p className="line-clamp-2 px-3 py-2 text-xs text-muted-foreground sm:text-sm">{card.promptText}</p>
            </button>
          ))}
        </main>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 text-white sm:p-8" role="dialog" aria-label={`${viewing.nickname}의 작품`} onClick={() => setViewing(null)}>
          <div className="flex items-center justify-between pb-3">
            <p className="text-xl font-semibold sm:text-2xl">{viewing.nickname}</p>
            <button type="button" aria-label="닫기" className="grid size-10 place-items-center"><X className="size-7" /></button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center gap-4">
            {viewing.referenceUrl && <img src={viewing.referenceUrl} alt="참고 사진" className="hidden max-h-[40vh] w-1/5 rounded-xl object-contain sm:block" />}
            <img src={viewing.resultUrl} alt={viewing.promptText} className="max-h-full max-w-full rounded-xl object-contain" />
          </div>
          <p className="mx-auto max-w-3xl pt-4 text-center text-base text-white/80 sm:text-lg">{viewing.promptText}</p>
        </div>
      )}
    </div>
  );
}
