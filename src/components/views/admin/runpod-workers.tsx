'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, PauseCircle, PlayCircle, RefreshCw, ServerCog, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Engine = 'h3' | 'wan' | 'ltx' | 'flux' | 'qwen_image' | 'blender' | 'character_blender' | 'rigging' | 'whisper' | 'trellis' | 'ace_music' | 'qwen3_tts';
type Worker = { id: string; status: string; gpu: string | null; image: string | null };
type Endpoint = { id: string; name: string; engine: Engine | null; engineLabel: string | null; image: string | null; gpu: string[]; gpuCount: number; workersMin: number; workersMax: number; currentWorkers: number; workerStates: Worker[]; modelStatus: string | null; idleTimeout: number | null; appEnabled: boolean };
type Inventory = { endpoints: Endpoint[]; slotLimit: number; configuredSlots: number; runningWorkers: number; syncedAt: string };

const ENGINES: { id: Engine; label: string }[] = [
  { id: 'h3', label: 'MiniMax H3' }, { id: 'wan', label: 'Wan' }, { id: 'ltx', label: 'LTX' }, { id: 'flux', label: 'Flux' }, { id: 'qwen_image', label: 'Qwen Image' }, { id: 'blender', label: 'Blender' }, { id: 'character_blender', label: 'Character Blender' }, { id: 'rigging', label: 'SkinTokens Rigging' }, { id: 'whisper', label: 'Whisper' }, { id: 'trellis', label: 'TRELLIS' }, { id: 'ace_music', label: 'ACE-Step Music' }, { id: 'qwen3_tts', label: 'Qwen3-TTS 보이스 클로닝' },
];

function statusTone(endpoint: Endpoint) {
  if (!endpoint.appEnabled || endpoint.workersMax === 0) return 'bg-muted text-muted-foreground';
  if (endpoint.currentWorkers > 0) return 'bg-emerald-500/10 text-emerald-700';
  return 'bg-amber-500/10 text-amber-700';
}

export function RunpodWorkers() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [engines, setEngines] = useState<Record<string, string>>({});
  const inventoryQ = useQuery({ queryKey: ['admin', 'runpod'], queryFn: () => api.get<Inventory>('/api/admin/runpod'), refetchInterval: 30_000 });
  const update = useMutation({
    mutationFn: (body: { endpointId: string; workersMax: number; engine: string | null }) => api.patch<Inventory>('/api/admin/runpod', body),
    onSuccess: (data) => { setError(''); qc.setQueryData(['admin', 'runpod'], data); },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'RunPod 설정을 변경하지 못했습니다.'),
  });
  const data = inventoryQ.data;
  const remaining = useMemo(() => data ? Math.max(0, data.slotLimit - data.configuredSlots) : 0, [data]);

  if (inventoryQ.isLoading) return <Card className="p-6"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />RunPod 워커 상태를 확인하는 중…</div></Card>;
  if (inventoryQ.isError || !data) return <Card className="p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">RunPod 운영 연결이 필요합니다</h3><p className="mt-1 text-sm text-muted-foreground">서버 환경변수 RUNPOD_API_KEY를 설정하면 실제 엔드포인트와 워커 상태를 조회할 수 있습니다.</p></div><Button variant="outline" size="sm" onClick={() => void inventoryQ.refetch()}><RefreshCw className="size-4" />다시 시도</Button></div></Card>;

  return <section className="space-y-4">
    <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><ServerCog className="size-5 text-primary" /><h2 className="text-lg font-bold">RunPod 워커 운영</h2></div><p className="mt-1 text-sm text-muted-foreground">각 모델의 실제 Serverless 엔드포인트를 조회하고 최대 워커를 제어합니다. 기본 대기는 min 0으로 유지합니다.</p></div><Button variant="outline" size="sm" disabled={inventoryQ.isFetching} onClick={() => void inventoryQ.refetch()}><RefreshCw className={`size-4 ${inventoryQ.isFetching ? 'animate-spin' : ''}`} />새로고침</Button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">설정 워커 한도</p><p className="mt-1 text-2xl font-bold">{data.configuredSlots} / {data.slotLimit}</p><p className="mt-1 text-xs text-muted-foreground">남은 배정 {remaining}개</p></div><div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">현재 떠 있는 워커</p><p className="mt-1 text-2xl font-bold">{data.runningWorkers}</p><p className="mt-1 text-xs text-muted-foreground">대기·초기화·실행 워커 합계</p></div><div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">마지막 동기화</p><p className="mt-1 text-sm font-semibold">{new Date(data.syncedAt).toLocaleTimeString('ko-KR')}</p><p className="mt-1 text-xs text-muted-foreground">30초마다 자동 갱신</p></div></div>
    </Card>
    {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="grid gap-4 xl:grid-cols-2">{data.endpoints.map((endpoint) => {
      const selectedEngine = engines[endpoint.id] ?? endpoint.engine ?? '';
      const off = endpoint.workersMax === 0 || !endpoint.appEnabled;
      const blocked = off && remaining < 1;
      return <Card key={endpoint.id} className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{endpoint.name}</h3><p className="mt-1 truncate font-mono text-xs text-muted-foreground">{endpoint.id}</p></div><Badge className={statusTone(endpoint)}>{off ? '꺼짐' : endpoint.currentWorkers > 0 ? `${endpoint.currentWorkers}개 동작` : '대기 가능'}</Badge></div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-muted/40 p-2"><span className="text-muted-foreground">GPU</span><p className="mt-1 font-medium">{endpoint.gpu.join(', ') || '확인 중'} · {endpoint.gpuCount}장</p></div><div className="rounded-lg bg-muted/40 p-2"><span className="text-muted-foreground">워커 설정</span><p className="mt-1 font-medium">min {endpoint.workersMin} · max {endpoint.workersMax}</p></div></div>
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">이미지: {endpoint.image || 'RunPod 템플릿 이미지 확인 중'}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><Select value={selectedEngine || 'unmapped'} onValueChange={(value) => setEngines((current) => ({ ...current, [endpoint.id]: value === 'unmapped' ? '' : value }))}><SelectTrigger><SelectValue placeholder="PLAYLAB 모델 연결" /></SelectTrigger><SelectContent><SelectItem value="unmapped">연결 안 함</SelectItem>{ENGINES.map((engine) => <SelectItem key={engine.id} value={engine.id}>{engine.label}</SelectItem>)}</SelectContent></Select><Button variant={off ? 'default' : 'outline'} disabled={update.isPending || blocked} onClick={() => update.mutate({ endpointId: endpoint.id, workersMax: off ? 1 : 0, engine: selectedEngine || null })}>{update.isPending ? <Loader2 className="size-4 animate-spin" /> : off ? <PlayCircle className="size-4" /> : <PauseCircle className="size-4" />}{off ? blocked ? '한도 초과' : '켜기' : '끄기'}</Button></div>
        {!off && <div className="mt-3 flex items-center gap-2"><span className="text-xs text-muted-foreground">동시 최대</span>{[1, 2, 3, 4].map((count) => <button key={count} type="button" disabled={update.isPending || (count > endpoint.workersMax && remaining < count - endpoint.workersMax)} onClick={() => update.mutate({ endpointId: endpoint.id, workersMax: count, engine: selectedEngine || null })} className={`rounded border px-2 py-1 text-xs ${endpoint.workersMax === count ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'} disabled:opacity-40`}>{count}</button>)}</div>}
        {endpoint.workerStates.length > 0 && <div className="mt-4 border-t pt-3 text-xs text-muted-foreground"><div className="mb-1 flex items-center gap-1"><Users className="size-3.5" />실제 워커</div>{endpoint.workerStates.map((worker) => <p key={worker.id} className="truncate">{worker.id} · {worker.status} · {worker.gpu || 'GPU 확인 중'}</p>)}</div>}
      </Card>;
    })}</div>
    {!data.endpoints.length && <Card className="p-6 text-sm text-muted-foreground">RunPod 엔드포인트가 없습니다. 엔드포인트를 만든 뒤 새로고침하세요.</Card>}
  </section>;
}
