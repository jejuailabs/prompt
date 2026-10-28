'use client';

// Admin › 수업 세션: open a login-free image room for a class, show its QR, watch it live and close it.
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeOff, Eye, ExternalLink, Loader2, Maximize2, Plus, QrCode, Square, Timer, UserX, UserCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ClassRoomState, ClassSessionAdminDTO, ClassSessionDetailDTO } from './types';

const UNIT_COST_HINT = 69; // GPT Image 2.5 Flare configured unit cost; the server recomputes from the provider row
const STATE_LABEL: Record<ClassRoomState, string> = { scheduled: '시작 전', open: '진행 중', ended: '종료' };
const won = (n: number) => `₩${Math.round(n).toLocaleString()}`;

function joinUrl(code: string) {
  return `${window.location.origin}/c/${code}`;
}

function localInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function useQrDataUrl(text: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    let alive = true;
    void QRCode.toDataURL(text, { width: 720, margin: 1, errorCorrectionLevel: 'M' }).then((data) => { if (alive) setUrl(data); });
    return () => { alive = false; };
  }, [text]);
  return url;
}

export function ClassSessionsPanel() {
  const q = useQuery({
    queryKey: ['admin', 'class-sessions'],
    queryFn: () => api.get<ClassSessionAdminDTO[]>('/api/admin/class-sessions'),
    refetchInterval: 5000,
  });
  return (
    <div className="space-y-5">
      <CreateSessionCard />
      {q.isLoading && <p className="text-sm text-muted-foreground">불러오는 중…</p>}
      {q.isError && <p role="alert" className="text-sm text-destructive">세션 목록을 불러오지 못했습니다: {q.error.message}</p>}
      {q.data?.length === 0 && <p className="text-sm text-muted-foreground">아직 연 수업이 없습니다.</p>}
      {q.data?.map((s) => <SessionCard key={s.id} session={s} />)}
    </div>
  );
}

function CreateSessionCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState(() => localInputValue(new Date()));
  const [minutes, setMinutes] = useState('120');
  const [maxParticipants, setMaxParticipants] = useState(15);
  const [perUserLimit, setPerUserLimit] = useState(10);
  const estimate = maxParticipants * perUserLimit * UNIT_COST_HINT;
  const [budget, setBudget] = useState<number | ''>('');

  const create = useMutation({
    mutationFn: () => {
      const start = new Date(startsAt);
      return api.post<ClassSessionAdminDTO>('/api/admin/class-sessions', {
        title,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + Number(minutes) * 60 * 1000).toISOString(),
        maxParticipants,
        perUserLimit,
        budgetKrw: budget === '' ? undefined : budget,
      });
    },
    onSuccess: (s) => {
      setTitle('');
      void qc.invalidateQueries({ queryKey: ['admin', 'class-sessions'] });
      toast({ title: `수업을 열었습니다 · 입장 코드 ${s.code}` });
    },
    onError: (e: Error) => toast({ title: '수업을 열지 못했습니다', description: e.message, variant: 'destructive' }),
  });

  return (
    <Card className="gap-4 p-4">
      <div>
        <h2 className="font-semibold">수업용 이미지 생성실 열기</h2>
        <p className="text-sm text-muted-foreground">학생은 QR로 들어와 닉네임만 입력하고 GPT Image 2.5 Flare로 이미지를 만듭니다. 비용은 학생 크레딧이 아니라 이 세션 예산(원가)에서 나갑니다.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="class-title">수업 이름</Label>
          <Input id="class-title" value={title} maxLength={60} placeholder="예: 10/30 생성형 AI 기초 3반" onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="class-start">시작</Label>
          <Input id="class-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>열어둘 시간</Label>
          <Select value={minutes} onValueChange={setMinutes}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['60', '90', '120', '180', '240'].map((m) => <SelectItem key={m} value={m}>{Number(m) / 60}시간{Number(m) % 60 ? ' 30분' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="class-max">최대 인원</Label>
          <Input id="class-max" type="number" min={1} max={40} value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value) || 1)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="class-limit">1인당 생성 한도</Label>
          <Input id="class-limit" type="number" min={1} max={30} value={perUserLimit} onChange={(e) => setPerUserLimit(Number(e.target.value) || 1)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="class-budget">예산 상한 (원가, 비우면 자동)</Label>
          <Input id="class-budget" type="number" min={0} placeholder={`자동: ${won(estimate)}`} value={budget} onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">예상 최대 원가: {maxParticipants}명 × {perUserLimit}장 × {won(UNIT_COST_HINT)} = <strong className="text-foreground">{won(estimate)}</strong></p>
        <Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}
          수업 열기
        </Button>
      </div>
    </Card>
  );
}

function SessionCard({ session: s }: { session: ClassSessionAdminDTO }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [qrOpen, setQrOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(s.state === 'open');
  const url = typeof window === 'undefined' ? '' : joinUrl(s.code);
  const qr = useQrDataUrl(url || null);

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<ClassSessionAdminDTO>(`/api/admin/class-sessions/${s.id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'class-sessions'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'class-session', s.id] });
    },
    onError: (e: Error) => toast({ title: '변경하지 못했습니다', description: e.message, variant: 'destructive' }),
  });

  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-start gap-4">
        <button type="button" className="shrink-0 rounded-lg border bg-white p-1.5" onClick={() => setQrOpen(true)} aria-label="QR 크게 보기">
          {qr ? <img src={qr} alt={`${s.title} 입장 QR`} className="size-24" /> : <div className="grid size-24 place-items-center"><QrCode className="size-6 text-muted-foreground" /></div>}
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{s.title}</h3>
            <Badge variant={s.state === 'open' ? 'default' : 'secondary'}>{STATE_LABEL[s.state]}</Badge>
          </div>
          <p className="text-sm">입장 코드 <strong className="font-mono text-base tracking-widest">{s.code}</strong> · <span className="text-muted-foreground">{url}</span></p>
          <p className="text-sm text-muted-foreground">
            {new Date(s.startsAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ~ {new Date(s.endsAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · {s.modelName}
          </p>
          <p className="text-sm tabular-nums">
            참여 <strong>{s.participants}/{s.maxParticipants}</strong>명 · 생성 <strong>{s.generated}</strong>장{s.failed ? ` (실패 ${s.failed})` : ''} · 원가 <strong>{won(s.spentKrw)}</strong> / {won(s.budgetKrw)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setQrOpen(true)}><Maximize2 className="mr-1 size-3.5" />QR 띄우기</Button>
          <Button size="sm" variant="outline" asChild><a href={`/c/${s.code}/board`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 size-3.5" />전시 보드</a></Button>
          <Button size="sm" variant="outline" disabled={patch.isPending} onClick={() => patch.mutate({ action: 'extend', extendMinutes: 30 })}><Timer className="mr-1 size-3.5" />{s.state === 'ended' ? '30분 다시 열기' : '30분 연장'}</Button>
          {s.state !== 'ended' && (
            <Button size="sm" variant="destructive" disabled={patch.isPending} onClick={() => { if (window.confirm('지금 수업을 종료할까요? 학생들은 더 이상 이미지를 만들 수 없습니다.')) patch.mutate({ action: 'close' }); }}>
              <Square className="mr-1 size-3.5" />종료
            </Button>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={s.boardPublic} onCheckedChange={(v) => patch.mutate({ boardPublic: v })} />보드 공개
          </label>
        </div>
      </div>
      <button type="button" className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setDetailOpen((v) => !v)}>
        {detailOpen ? '학생·생성 내역 접기' : '학생·생성 내역 보기'}
      </button>
      {detailOpen && <SessionDetail session={s} onPatch={(body) => patch.mutate(body)} />}

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-[min(92vw,820px)] place-items-center gap-4 p-8 text-center">
          <DialogTitle className="text-2xl">{s.title}</DialogTitle>
          {qr && <img src={qr} alt="입장 QR" className="aspect-square w-[min(70vh,560px)] max-w-full rounded-xl bg-white p-3" />}
          <p className="text-lg text-muted-foreground">카메라로 QR을 찍거나 주소를 입력하세요</p>
          <p className="break-all font-mono text-2xl font-semibold">{url.replace(/^https?:\/\//, '')}</p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SessionDetail({ session, onPatch }: { session: ClassSessionAdminDTO; onPatch: (body: Record<string, unknown>) => void }) {
  const q = useQuery({
    queryKey: ['admin', 'class-session', session.id],
    queryFn: () => api.get<ClassSessionDetailDTO>(`/api/admin/class-sessions/${session.id}`),
    refetchInterval: session.state === 'open' ? 5000 : false,
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>;
  if (q.isError || !q.data) return <p role="alert" className="text-sm text-destructive">내역을 불러오지 못했습니다</p>;
  const { participants, generations } = q.data;

  return (
    <div className="space-y-4 border-t pt-3">
      <div>
        <h4 className="mb-2 text-sm font-medium">학생 {participants.length}명</h4>
        {participants.length === 0 && <p className="text-sm text-muted-foreground">아직 들어온 학생이 없습니다.</p>}
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <span key={p.id} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${p.blocked ? 'opacity-50 line-through' : ''}`}>
              {p.nickname} <span className="tabular-nums text-muted-foreground">{p.used}/{session.perUserLimit}</span>
              <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={p.blocked ? `${p.nickname} 차단 해제` : `${p.nickname} 차단`} onClick={() => onPatch({ participantId: p.id, blocked: !p.blocked })}>
                {p.blocked ? <UserCheck className="size-3.5" /> : <UserX className="size-3.5" />}
              </button>
            </span>
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-medium">생성 내역 {generations.length}건</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {generations.map((g) => (
            <div key={g.id} className={`overflow-hidden rounded-lg border text-xs ${g.hidden ? 'opacity-40' : ''}`}>
              {g.resultUrl
                ? <img src={g.resultUrl} alt={g.promptText} className="aspect-square w-full object-cover" loading="lazy" />
                : <div className="grid aspect-square place-items-center bg-muted p-2 text-center text-muted-foreground">{g.status === 'failed' ? `실패: ${g.rawError?.slice(0, 80) ?? ''}` : '생성 중…'}</div>}
              <div className="space-y-1 p-2">
                <div className="flex items-center justify-between gap-1">
                  <strong className="truncate">{g.nickname}</strong>
                  {g.status === 'done' && (
                    <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={g.hidden ? '보드에 다시 보이기' : '보드에서 숨기기'} onClick={() => onPatch({ generationId: g.id, hidden: !g.hidden })}>
                      {g.hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>
                  )}
                </div>
                <p className="line-clamp-2 text-muted-foreground">{g.promptText}</p>
                {g.usage && <p className="tabular-nums text-muted-foreground">토큰 {String(g.usage.input_tokens ?? '?')} → {String(g.usage.output_tokens ?? '?')}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
