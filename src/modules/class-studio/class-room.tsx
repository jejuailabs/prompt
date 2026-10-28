'use client';

// Student screen for /c/<code>: a ChatGPT-like mobile chat where every message becomes one image.
// No login — the server recognises this browser by an httpOnly cookie issued on join.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, Download, ImagePlus, LayoutGrid, Loader2, Plus, RotateCcw, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { cssAspect, type ClassAspect, type ClassAspectChoice, type ClassGenerationDTO, type ClassRoomDTO } from './types';

const ASPECT_OPTIONS: { value: ClassAspectChoice; label: string; hint: string }[] = [
  { value: 'auto', label: '자동', hint: '사진·프롬프트 따라' },
  { value: '1:1', label: '1:1', hint: '정사각' },
  { value: '3:4', label: '3:4', hint: '세로' },
  { value: '9:16', label: '9:16', hint: '폰 화면 세로' },
  { value: '4:3', label: '4:3', hint: '가로' },
  { value: '16:9', label: '16:9', hint: '와이드' },
];

/** Tall results get a narrower bubble so a 9:16 image doesn't fill the whole phone screen. */
function bubbleWidth(aspect: ClassAspect) {
  return aspect === '9:16' || aspect === '3:4' ? 'w-[62%]' : 'w-[85%]';
}

function AspectGlyph({ aspect }: { aspect: ClassAspectChoice }) {
  if (aspect === 'auto') return <span className="block size-3.5 rounded-[3px] border-[1.5px] border-dashed border-current" />;
  const [w, h] = aspect.split(':').map(Number);
  const scale = 14 / Math.max(w, h);
  return <span className="block rounded-[3px] border-[1.5px] border-current" style={{ width: w * scale, height: h * scale }} />;
}

const SUGGESTIONS = [
  '우주복을 입은 고양이가 달에서 라면을 먹는 장면, 수채화',
  '내 사진을 지브리 느낌의 애니메이션 캐릭터로 바꿔줘',
  '제주 바다가 보이는 미래 도시, 해질녘, 사진처럼',
];
const MAX_UPLOAD_EDGE = 1536;

/** Downscale on the phone before upload so a 12MP camera shot doesn't crawl over classroom Wi-Fi. */
async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return blob ?? file;
  } catch {
    return file; // the server re-encodes anything sharp can read
  }
}

async function saveImage(url: string, name: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], `${name}.png`, { type: blob.type || 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
    const href = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href, download: file.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch (e) {
    if ((e as Error).name !== 'AbortError') window.open(url, '_blank');
  }
}

export function ClassRoom({ code }: { code: string }) {
  const triggered = useRef(new Set<string>());
  // Poll while an image is in flight; otherwise only refetch on focus (the phone coming back from the photo picker).
  const q = useQuery({
    queryKey: ['class-room', code],
    queryFn: () => api.get<ClassRoomDTO>(`/api/class/${code}`),
    refetchInterval: (query) => (query.state.data?.generations.some((g) => g.status === 'queued' || g.status === 'running') ? 3000 : false),
    retry: 1,
  });
  const room = q.data ?? null;
  const loadError = q.error ? (q.error instanceof ApiError ? q.error.message : '연결이 불안정해요. 잠시 후 다시 시도해주세요') : null;
  const { refetch } = q;
  const refresh = useCallback(async () => { await refetch(); }, [refetch]);

  // Run queued images, including ones left queued by a tab that closed before calling /process.
  useEffect(() => {
    if (!room) return;
    for (const g of room.generations) {
      if (g.status !== 'queued' || triggered.current.has(g.id)) continue;
      triggered.current.add(g.id);
      void api.post(`/api/class/${code}/process`, { id: g.id }).catch(() => undefined).finally(() => void refresh());
    }
  }, [room, code, refresh]);

  if (!room) {
    return (
      <Shell title="COAI 수업">
        <div className="grid flex-1 place-items-center p-6 text-center text-muted-foreground">
          {loadError ? <div className="space-y-3"><p>{loadError}</p><button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => void refresh()}>다시 시도</button></div> : <Loader2 className="size-6 animate-spin" />}
        </div>
      </Shell>
    );
  }

  const remaining = room.me ? Math.max(0, room.perUserLimit - room.me.used) : room.perUserLimit;
  const subtitle = room.me ? `${room.me.nickname} · 남은 ${remaining}/${room.perUserLimit}장` : room.modelName;

  if (room.state !== 'open' && !room.me) {
    return (
      <Shell title={room.title} subtitle={room.modelName}>
        <Notice text={room.state === 'scheduled'
          ? `${new Date(room.startsAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}에 수업이 열려요`
          : '수업이 끝났어요'} />
      </Shell>
    );
  }
  if (!room.me) {
    return (
      <Shell title={room.title} subtitle={room.modelName}>
        <JoinForm code={code} full={room.full} onJoined={refresh} />
      </Shell>
    );
  }
  return (
    <Shell title={room.title} subtitle={subtitle} boardHref={`/c/${code}/board`}>
      <Chat code={code} room={room} remaining={remaining} onChange={refresh} />
    </Shell>
  );
}

function Shell({ title, subtitle, boardHref, children }: { title: string; subtitle?: string; boardHref?: string; children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-2 px-4">
        <div className="size-8" />
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-[15px] font-semibold">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {boardHref
          ? <a href={boardHref} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="전시 보드 보기"><LayoutGrid className="size-[18px]" /></a>
          : <div className="size-8" />}
      </header>
      {children}
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <div className="grid flex-1 place-items-center p-6 text-center text-lg text-muted-foreground">{text}</div>;
}

function JoinForm({ code, full, onJoined }: { code: string; full: boolean; onJoined: () => Promise<void> }) {
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/class/${code}/join`, { nickname });
      await onJoined();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '입장하지 못했어요');
    } finally {
      setBusy(false);
    }
  }

  if (full) return <Notice text="정원이 모두 찼어요. 선생님께 알려주세요" />;
  return (
    <form onSubmit={join} className="flex flex-1 flex-col justify-center gap-6 px-6 pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="space-y-2 text-center">
        <p className="text-2xl font-semibold">반가워요!</p>
        <p className="text-muted-foreground">전시 보드에 보일 닉네임을 정해주세요</p>
      </div>
      <input
        autoFocus
        value={nickname}
        maxLength={12}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="닉네임 (12자까지)"
        className="h-14 rounded-2xl border bg-muted/40 px-5 text-center text-base outline-none focus:border-foreground/40"
      />
      {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={!nickname.trim() || busy} className="h-14 rounded-full bg-foreground text-base font-semibold text-background disabled:opacity-30">
        {busy ? <Loader2 className="mx-auto size-5 animate-spin" /> : '입장하기'}
      </button>
    </form>
  );
}

function Chat({ code, room, remaining, onChange }: { code: string; room: ClassRoomDTO; remaining: number; onChange: () => Promise<void> }) {
  const [prompt, setPrompt] = useState('');
  const [attachment, setAttachment] = useState<{ path: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ClassGenerationDTO | null>(null);
  const [aspect, setAspect] = useState<ClassAspectChoice>('auto');
  const [aspectMenu, setAspectMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const busy = room.generations.some((g) => g.status === 'queued' || g.status === 'running');
  const closed = room.state !== 'open';
  const blockedReason = closed ? '수업이 끝났어요'
    : room.me?.blocked ? '선생님이 생성을 멈췄어요'
    : remaining <= 0 ? `${room.perUserLimit}장을 모두 만들었어요`
    : room.budgetExhausted ? '이번 수업 예산을 다 썼어요'
    : null;
  const canSend = !blockedReason && !busy && !sending && !uploading && prompt.trim().length > 0;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [room.generations.length, busy]);
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [prompt]);

  async function attach(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const preview = URL.createObjectURL(file);
    try {
      const form = new FormData();
      form.append('file', await shrinkPhoto(file), 'photo.jpg');
      const res = await fetch(`/api/class/${code}/reference`, { method: 'POST', body: form });
      const json = await res.json() as { ok: boolean; data?: { path: string }; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error || '사진을 올리지 못했어요');
      setAttachment({ path: json.data.path, preview });
    } catch (e) {
      URL.revokeObjectURL(preview);
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function send() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await api.post<ClassGenerationDTO>(`/api/class/${code}/generate`, { prompt: prompt.trim(), referencePath: attachment?.path ?? null, aspect });
      setPrompt('');
      setAttachment(null);
      await onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '보내지 못했어요. 다시 시도해주세요');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {room.generations.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-6 px-5 py-10">
            <p className="text-center text-2xl font-semibold">무엇을 그려볼까요?</p>
            <div className="flex w-full max-w-md flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => { setPrompt(s); textRef.current?.focus(); }} className="rounded-2xl border px-4 py-3 text-left text-sm text-muted-foreground active:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-4">
            {room.generations.map((g) => (
              <div key={g.id} className="flex flex-col gap-3">
                <div className="flex flex-col items-end gap-1.5">
                  {g.referenceUrl && <img src={g.referenceUrl} alt="첨부한 사진" className="max-h-40 rounded-2xl object-cover" />}
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-muted px-4 py-2.5 text-[15px] leading-relaxed">{g.promptText}</p>
                </div>
                <Result gen={g} onOpen={() => setViewing(g)} onRetry={() => { setPrompt(g.promptText); textRef.current?.focus(); }} />
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <footer className="shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
        {(error || blockedReason) && <p role="alert" className="mb-2 text-center text-sm text-muted-foreground">{error ?? blockedReason}</p>}
        <div className="mx-auto max-w-2xl rounded-[28px] border bg-background p-2 shadow-sm">
          {(attachment || uploading) && (
            <div className="relative mb-2 ml-1 size-16">
              {attachment
                ? <img src={attachment.preview} alt="첨부할 사진" className="size-16 rounded-xl object-cover" />
                : <div className="grid size-16 place-items-center rounded-xl bg-muted"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}
              {attachment && (
                <button type="button" aria-label="첨부 취소" onClick={() => setAttachment(null)} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background">
                  <X className="size-3" />
                </button>
              )}
            </div>
          )}
          <div className="flex items-end gap-1.5">
            <button type="button" aria-label="사진 첨부" disabled={!!blockedReason || uploading} onClick={() => fileRef.current?.click()} className="grid size-10 shrink-0 place-items-center rounded-full text-foreground active:bg-muted disabled:opacity-30">
              {attachment ? <ImagePlus className="size-5" /> : <Plus className="size-6" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void attach(e.target.files?.[0])} />
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label={`비율: ${aspect === 'auto' ? '자동' : aspect}`}
                aria-expanded={aspectMenu}
                disabled={!!blockedReason}
                onClick={() => setAspectMenu((v) => !v)}
                className="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm text-muted-foreground active:bg-muted disabled:opacity-30"
              >
                <AspectGlyph aspect={aspect} />
                {aspect === 'auto' ? '자동' : aspect}
              </button>
              {aspectMenu && (
                <>
                  <button type="button" aria-label="비율 선택 닫기" className="fixed inset-0 z-10 cursor-default" onClick={() => setAspectMenu(false)} />
                  <div role="menu" className="absolute bottom-12 left-0 z-20 w-56 overflow-hidden rounded-2xl border bg-background py-1.5 shadow-lg">
                    {ASPECT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={aspect === option.value}
                        onClick={() => { setAspect(option.value); setAspectMenu(false); }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-muted ${aspect === option.value ? 'font-semibold' : ''}`}
                      >
                        <span className="grid w-4 place-items-center"><AspectGlyph aspect={option.value} /></span>
                        <span className="w-10 text-[15px]">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.hint}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <textarea
              ref={textRef}
              rows={1}
              value={prompt}
              maxLength={1000}
              disabled={!!blockedReason}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); void send(); } }}
              placeholder={attachment ? '어떻게 바꿀까요?' : '무엇을 그릴까요?'}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button type="button" aria-label="보내기" disabled={!canSend} onClick={() => void send()} className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background disabled:opacity-20">
              {sending || busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
            </button>
          </div>
        </div>
      </footer>

      {viewing?.resultUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-label="이미지 크게 보기">
          <div className="flex h-14 items-center justify-between px-3 text-white">
            <button type="button" aria-label="닫기" onClick={() => setViewing(null)} className="grid size-10 place-items-center"><X className="size-6" /></button>
            <button type="button" onClick={() => void saveImage(viewing.resultUrl!, `coai-${viewing.id.slice(0, 8)}`)} className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm">
              <Download className="size-4" />저장
            </button>
          </div>
          <div className="grid flex-1 place-items-center p-2"><img src={viewing.resultUrl} alt={viewing.promptText} className="max-h-full max-w-full object-contain" /></div>
          <p className="max-h-28 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 text-sm text-white/70">{viewing.promptText}</p>
        </div>
      )}
    </>
  );
}

function Result({ gen, onOpen, onRetry }: { gen: ClassGenerationDTO; onOpen: () => void; onRetry: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const inFlight = gen.status === 'queued' || gen.status === 'running';
  useEffect(() => {
    if (!inFlight) return;
    const started = new Date(gen.createdAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - started) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [inFlight, gen.createdAt]);

  if (inFlight) {
    return (
      <div className={`${bubbleWidth(gen.aspect)} max-w-sm`}>
        <div className="animate-pulse rounded-2xl bg-gradient-to-br from-muted to-muted/40" style={{ aspectRatio: cssAspect(gen.aspect) }} />
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />이미지 만드는 중… {elapsed}초</p>
      </div>
    );
  }
  if (gen.status === 'failed') {
    return (
      <div className="flex max-w-sm flex-col items-start gap-2">
        <p className="text-[15px]">{gen.error}</p>
        <button type="button" onClick={onRetry} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"><RotateCcw className="size-3.5" />프롬프트 다시 쓰기</button>
      </div>
    );
  }
  return (
    <div className={`${bubbleWidth(gen.aspect)} max-w-sm`}>
      <button type="button" onClick={onOpen} className="block w-full overflow-hidden rounded-2xl">
        <img src={gen.resultUrl!} alt={gen.promptText} className="w-full object-cover" style={{ aspectRatio: cssAspect(gen.aspect) }} />
      </button>
      <button type="button" onClick={() => void saveImage(gen.resultUrl!, `coai-${gen.id.slice(0, 8)}`)} className="mt-1.5 flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground active:bg-muted">
        <Download className="size-4" />저장
      </button>
    </div>
  );
}
