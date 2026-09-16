'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { GenerationTime } from '@/components/shared/generation-time';
import { CancelVideo } from '@/components/shared/cancel-video';
import { useAppStore } from '@/lib/store';
import { H3_PRESETS, type H3Preset } from '@/lib/h3-presets';
import { COMPARISON_MODELS, comparisonTerminal, type ComparisonRow } from '@/lib/video-comparison';

function Result({ row }: { row: ComparisonRow }) {
  const [duration, setDuration] = useState<number>();
  const [elapsed, setElapsed] = useState(0);
  const status = useQuery({
    queryKey: ['video-studio-render-status', row.projectId],
    queryFn: () => api.get<{ status: string; videoUrl?: string; executionTime?: number; delayTime?: number; error?: string }>(`/api/video-studio/projects/${row.projectId}/render/status`),
    // A lost submission response may still have queued a paid job. Reconcile it;
    // do not classify a transport error as a GPU failure or auto-submit again.
    enabled: !['READY', 'SUBMITTING'].includes(row.status),
    refetchInterval: q => comparisonTerminal(q.state.data?.status ?? row.status) || (q.state.status === 'error' && q.state.errorUpdateCount >= 5) ? false : 4000,
    retry: 1,
  });
  const current = status.data ?? row;
  const active = !comparisonTerminal(current.status) && !['READY', 'REQUEST_ERROR'].includes(current.status);
  useEffect(() => {
    if (!active) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - Date.parse(row.comparison.createdAt)) / 1000)));
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [active, row.comparison.createdAt]);
  const model = COMPARISON_MODELS.find(m => m.engine === row.engine)!;
  const labels: Record<string, string> = { READY: '미접수', SUBMITTING: '요청 접수 중', REQUEST_ERROR: '접수 확인 필요', IN_QUEUE: '워커 준비·대기', IN_PROGRESS: '생성 중', COMPLETED: '완료', FAILED: '실패', CANCELLED: '중지됨', TIMED_OUT: '시간 초과' };
  return <article className="space-y-3 rounded-xl border p-4">
    <h3 className="font-semibold">{model.label}</h3>
    <p role="status" className="text-sm">{active && <span className="mr-2 inline-block size-3 animate-pulse rounded-full bg-primary" />}{labels[current.status] ?? current.status}{active && ` · 경과 ${elapsed}초`}</p>
    {current.videoUrl ? <video className="aspect-video w-full rounded-lg bg-black" src={current.videoUrl} controls playsInline preload="metadata" onLoadedMetadata={e => setDuration(e.currentTarget.duration)} /> : <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">{active ? '완료되면 영상이 여기에 표시됩니다' : '영상 결과 없음'}</div>}
    <p className="text-xs">832×480 · 24fps · {row.engine === 'h3' ? H3_PRESETS[row.comparison.preset].label : `${model.steps}스텝`} · 시드 {row.comparison.seed}</p>
    <p className="text-xs">실제 길이: {duration ? `${duration.toFixed(2)}초` : `예상 ${(model.frames / 24).toFixed(2)}초 (모델 프레임 제약)`}</p>
    <GenerationTime executionTime={current.executionTime} delayTime={current.delayTime} detailed />
    <details className="break-all text-xs text-muted-foreground"><summary>실행 환경{row.comparison.environment.optimized ? ' · cu130/Sage 최적화 이미지' : ' · 기존 런타임'}</summary><p>{row.comparison.environment.gpu.join(' / ')} (허용 GPU)</p><p>{row.comparison.environment.image}</p></details>
    {(current.error || status.error) && <p role="alert" className="text-sm text-destructive">{current.error || String(status.error)}{status.error && ' · 상태 조회 오류이며 생성 실패로 확정된 것은 아닙니다.'}</p>}
    {status.error && <Button size="sm" variant="outline" onClick={() => void status.refetch()}>상태 다시 확인</Button>}
    {!comparisonTerminal(current.status) && current.status !== 'READY' && <CancelVideo projectId={row.projectId} />}
    <Button size="sm" variant="outline" onClick={() => useAppStore.getState().navigate('video-studio', { studio: 'workspace', project: row.projectId })}>작업실에서 확인</Button>
    {current.videoUrl && <a className="ml-3 text-sm underline" href={current.videoUrl} target="_blank" rel="noreferrer">영상 열기</a>}
  </article>;
}

export function VideoComparison() {
  const [prompt, setPrompt] = useState('Cinematic close-up of an adult woman aged 25 beside a swimming pool in summer shade. Natural skin texture, detailed eyelashes, tiny water droplets on her cheek, damp strands of hair. Opaque white cotton T-shirt. Soft side lighting, turquoise background bokeh. A very slow straight camera push-in, one natural blink. Stable face, no cuts, no text, no speech.');
  const [preset, setPreset] = useState<H3Preset>('standard20');
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const stop = useRef(false);
  const lock = useRef(false);
  const history = useQuery({ queryKey: ['admin-video-comparison'], queryFn: () => api.get<ComparisonRow[]>('/api/admin/video-comparison') });
  const shown = rows.length ? rows : (history.data ?? []).filter(row => row.comparison.batchId === history.data?.[0]?.comparison.batchId);
  const batches = [...new Map((history.data ?? []).map(row => [row.comparison.batchId, row.comparison])).values()];
  const update = (id: string, patch: Partial<ComparisonRow>) => setRows(old => old.map(row => row.projectId === id ? { ...row, ...patch } : row));
  async function run() {
    if (lock.current) return;
    lock.current = true; stop.current = false; setBusy(true); setMessage('공통 프롬프트와 실행 환경 확인 중…');
    try {
      const prepared = await api.post<ComparisonRow[]>('/api/admin/video-comparison', { prompt, preset });
      setRows(prepared);
      if (stop.current) { setMessage('렌더를 접수하지 않고 중지했습니다.'); return; }
      setMessage('3개 모델에 병렬 접수 중…');
      await Promise.allSettled(prepared.map(async row => {
        update(row.projectId, { status: 'SUBMITTING' });
        try {
          const result = await api.post<{ status: string }>(`/api/video-studio/projects/${row.projectId}/render`, {});
          update(row.projectId, { status: result.status });
          if (stop.current) {
            const cancelled = await api.post<{ status: string }>(`/api/video-studio/projects/${row.projectId}/render/cancel`, {});
            update(row.projectId, { status: cancelled.status });
          }
        } catch (error) { update(row.projectId, { status: 'REQUEST_ERROR', error: String(error) }); }
      }));
      setMessage('각 모델의 진행 상태를 아래에서 확인하세요. 접수 오류는 자동 재시도하지 않습니다.');
      void history.refetch();
    } catch (error) { setMessage(String(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="mb-6 space-y-4 rounded-xl border p-5">
    <h2 className="font-semibold">영상 모델 동시 비교</h2>
    <p className="text-sm text-muted-foreground">실제 연결 모델: H3 / LTX 2B / Wan 2.2. 프롬프트는 한 번만 정리해 동일하게 전달합니다. 6초 요청 · 832×480 · 24fps · 시드 12345. 같은 시드는 모델 간 같은 노이즈를 의미하지 않습니다.</p>
    <p className="text-sm text-amber-700">GPU는 모델별 Blackwell 6000 96GB 1장으로 맞춥니다. H3만 cu130·Sage 최적화 대상이며 런타임·스텝·프레임 수는 다릅니다. 동시 접수해도 워커 확보 시점은 다를 수 있습니다. 이미지 설치·초기화 시간은 대기 시간과 함께 확인하세요.</p>
    <textarea aria-label="모델 공통 비교 프롬프트" rows={5} maxLength={3000} disabled={busy} className="w-full rounded border bg-background p-3" value={prompt} onChange={e => setPrompt(e.target.value)} />
    <div className="flex flex-wrap gap-2">{(Object.keys(H3_PRESETS) as H3Preset[]).map(p => <Button key={p} variant={p === preset ? 'default' : 'outline'} disabled={busy} onClick={() => setPreset(p)}>H3 {H3_PRESETS[p].label}</Button>)}</div>
    <Button disabled={busy || prompt.trim().length < 3} onClick={() => void run()}>3개 동시 생성 · 합계 185 크레딧</Button>
    {busy && <Button variant="destructive" onClick={() => { stop.current = true; setMessage('중지 요청됨 · 접수 중인 응답을 확인한 뒤 취소합니다.'); }}>전체 접수 중지</Button>}
    <p role="status" className="text-sm">{message}</p>
    {history.error && <p role="alert" className="text-sm text-destructive">기록 조회 실패: {String(history.error)}</p>}
    {batches.length > 0 && <select aria-label="이전 비교 결과" disabled={busy} className="max-w-full rounded border bg-background p-2" value={shown[0]?.comparison.batchId ?? ''} onChange={e => setRows((history.data ?? []).filter(row => row.comparison.batchId === e.target.value))}>{batches.map(batch => <option key={batch.batchId} value={batch.batchId}>{new Date(batch.createdAt).toLocaleString()} · {batch.batchId.slice(0, 8)}</option>)}</select>}
    {shown.length > 0 && <><details className="text-sm"><summary>세 모델에 전달한 공통 프롬프트</summary><p className="whitespace-pre-wrap break-words py-2">{shown[0].comparison.compiledPrompt}</p></details><div className="grid gap-4 xl:grid-cols-3">{[...shown].sort((a,b) => COMPARISON_MODELS.findIndex(m => m.engine === a.engine) - COMPARISON_MODELS.findIndex(m => m.engine === b.engine)).map(row => <Result key={row.projectId} row={row} />)}</div></>}
  </section>;
}
