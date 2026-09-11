'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { YoutubeAnalysisDTO } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function YoutubeSummaryTool() {
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<YoutubeAnalysisDTO | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const analysisId = new URLSearchParams(window.location.search).get('analysis');
    if (!analysisId) return;
    void api.get<YoutubeAnalysisDTO[]>('/api/youtube/saved').then((items) => {
      const item = items.find((v) => v.id === analysisId);
      if (item) { setAnalysis(item); setSaved(true); }
    });
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let stopped = false;
    const poll = async () => {
      try {
        await api.post(`/api/youtube/jobs/${jobId}`);
        const data = await api.get<{ status: string; analysis: YoutubeAnalysisDTO; error?: string | null }>(`/api/youtube/jobs/${jobId}`);
        if (stopped) return;
        setAnalysis(data.analysis);
        if (data.status === 'done' || data.status === 'failed') { setPending(false); setJobId(null); if (data.error) setError(data.error); }
      } catch (e) { if (!stopped) { setError(e instanceof Error ? e.message : '분석에 실패했습니다'); setPending(false); } }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 3000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [jobId]);

  const start = async () => {
    setError(null); setSaved(false); setPending(true); setAnalysis(null);
    try {
      const data = await api.post<{ analysis: YoutubeAnalysisDTO; jobId: string | null }>('/api/youtube/analyses', { url });
      setAnalysis(data.analysis); setJobId(data.jobId);
      if (!data.jobId) setPending(false);
    } catch (e) { setError(e instanceof Error ? e.message : '분석을 시작할 수 없습니다'); setPending(false); }
  };
  const save = async () => { if (!analysis) return; await api.post('/api/youtube/saved', { analysisId: analysis.id }); setSaved(true); };

  return <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
    <div className="mb-8"><p className="text-sm font-medium text-primary">PLAYLAB TOOL</p><h1 className="mt-1 text-3xl font-bold">YouTube 영상 요약하기</h1><p className="mt-2 text-muted-foreground">영상 URL을 넣으면 자막 기반 학습 노트로 정리하고, 내 프로젝트에 보관합니다.</p></div>
    <Card className="gap-3 p-4 md:flex-row">
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." disabled={pending} />
      <Button onClick={() => void start()} disabled={!url.trim() || pending} className="shrink-0">{pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} 분석하기</Button>
    </Card>
    {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    {analysis && <AnalysisResult analysis={analysis} pending={pending} saved={saved} onSave={() => void save()} />}
  </div>;
}

export function AnalysisResult({ analysis, pending, saved, onSave }: { analysis: YoutubeAnalysisDTO; pending?: boolean; saved?: boolean; onSave?: () => void }) {
  return <div className="mt-6 space-y-4">
    <Card className="gap-4 p-5 md:flex-row">
      {analysis.thumbnailUrl && <img src={analysis.thumbnailUrl} alt="" className="aspect-video w-full rounded-md object-cover md:w-56" />}
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{analysis.category || '분석 중'}</Badge>{analysis.transcriptSource && <Badge variant="outline">자막: {analysis.transcriptSource}</Badge>}</div><h2 className="mt-2 text-xl font-bold">{analysis.title || '영상 정보를 가져오는 중입니다'}</h2>{analysis.channelTitle && <p className="mt-1 text-sm text-muted-foreground">{analysis.channelTitle}</p>}{pending && <p className="mt-3 flex items-center gap-2 text-sm text-primary"><Loader2 className="size-4 animate-spin" />자막과 학습 노트를 만들고 있습니다.</p>}{onSave && analysis.status === 'done' && <Button size="sm" className="mt-4" variant="outline" onClick={onSave}><Bookmark className="size-4" />{saved ? '저장됨' : '내 프로젝트에 저장'}</Button>}</div>
    </Card>
    {analysis.qualityWarning && <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300">{analysis.qualityWarning}</Card>}
    {analysis.status === 'done' && <><Card className="p-5"><h3 className="font-semibold">핵심 요약</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{analysis.summary}</p></Card><Card className="p-5"><h3 className="font-semibold">상세 학습 노트</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{analysis.reportSummary}</p>{analysis.keywords.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{analysis.keywords.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}</div>}</Card>{analysis.chapters.length > 0 && <Card className="p-5"><h3 className="font-semibold">챕터별 정리</h3><div className="mt-3 space-y-3">{analysis.chapters.map((c, i) => <div key={`${c.title}-${i}`}><p className="text-sm font-medium">{c.timestamp ? `${c.timestamp} · ` : ''}{c.title}</p><p className="mt-1 text-sm text-muted-foreground">{c.summary}</p></div>)}</div></Card>}{analysis.transcript && <Card className="p-5"><h3 className="font-semibold">전체 자막</h3><p className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{analysis.transcript}</p></Card>}</>}
  </div>;
}
