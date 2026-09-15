'use client';
import { GenerationTime } from '@/components/shared/generation-time';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export function FluxFirstFrame({ prompt, aspect, onReady }: { prompt: string; aspect: string; onReady: (url: string) => void }) {
  const [id, setId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const applied = useRef<string | null>(null);
  const query = useQuery({
    queryKey: ['flux-first-frame', id], enabled: Boolean(id),
    queryFn: () => api.get<{ status: string; url?: string; error?: string; executionTime?: number; delayTime?: number }>(`/api/video-studio/first-frame?id=${id}`),
    refetchInterval: (q) => ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(q.state.data?.status ?? '') ? false : 3000,
  });
  useEffect(() => {
    if (query.data?.url && applied.current !== query.data.url) { applied.current = query.data.url; onReady(query.data.url); }
  }, [query.data?.url, onReady]);
  const active = submitting || Boolean(id && !['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(query.data?.status ?? '') && !query.isError);
  async function generate() {
    setError(''); setSubmitting(true);
    try { const result = await api.post<{ id: string }>('/api/video-studio/first-frame', { prompt, aspect }); setId(result.id); }
    catch (e) { setError(e instanceof Error ? e.message : '이미지 생성 요청 실패'); }
    finally { setSubmitting(false); }
  }
  return <div className="space-y-2 rounded-xl border p-3">
    {query.data?.url && <GenerationTime executionTime={query.data.executionTime} delayTime={query.data.delayTime} />}
    <Button type="button" variant="outline" disabled={active || prompt.trim().length < 3} onClick={() => void generate()}>{active ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} FLUX로 시작 이미지 생성 · 18 크레딧</Button>
    <p className="text-xs text-muted-foreground" role="status">{active ? (query.data?.status === 'IN_PROGRESS' ? 'FLUX가 이미지를 생성하고 있습니다…' : '이미지 생성 워커를 기다리고 있습니다…') : query.data?.url ? '시작 이미지가 준비됐습니다. 아래 첫 샷 만들기를 누르면 영상이 생성됩니다.' : '장면 설명으로 이미지를 만든 뒤 영상의 첫 프레임으로 사용합니다.'}</p>
    {(error || query.data?.error || query.isError) && <p role="alert" className="text-xs text-destructive">{error || query.data?.error || '작업 상태를 확인하지 못했습니다. 잠시 후 자동 재조회합니다.'}</p>}
  </div>;
}
