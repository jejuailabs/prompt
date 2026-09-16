'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bookmark, Check, ClipboardCopy, Download, FileText, Loader2, Sparkles } from 'lucide-react';
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

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [text]);
  return <Button size="sm" variant="outline" onClick={copy}>
    {copied ? <><Check className="size-3.5" />복사됨</> : <><ClipboardCopy className="size-3.5" />{label}</>}
  </Button>;
}

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(<ul key={`ul-${elements.length}`} className="my-2 ml-4 list-disc space-y-1">{listItems.map((item, i) => <li key={i} className="text-sm leading-6 text-muted-foreground">{item}</li>)}</ul>);
    listItems = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ')) { flushList(); elements.push(<h4 key={i} className="mt-5 mb-2 text-base font-semibold">{line.slice(4)}</h4>); }
    else if (line.startsWith('## ')) { flushList(); elements.push(<h3 key={i} className="mt-6 mb-3 text-lg font-bold">{line.slice(3)}</h3>); }
    else if (/^- \[[ x]\] /.test(line)) { flushList(); const checked = line[3] === 'x'; elements.push(<label key={i} className="mt-1 flex items-start gap-2 text-sm text-muted-foreground"><input type="checkbox" defaultChecked={checked} className="mt-1 rounded" /><span>{line.slice(6)}</span></label>); }
    else if (line.startsWith('- ')) { listItems.push(line.slice(2)); }
    else if (line.trim() === '') { flushList(); }
    else { flushList(); elements.push(<p key={i} className="my-1 text-sm leading-6 text-muted-foreground">{line}</p>); }
  }
  flushList();
  return elements;
}

function generateStudyPdf(analysis: YoutubeAnalysisDTO) {
  const title = analysis.title || '학습 노트';
  const date = new Date().toLocaleDateString('ko-KR');

  let content = `${title}\n채널: ${analysis.channelTitle || '-'}\n날짜: ${date}\n${'='.repeat(60)}\n\n`;
  content += `■ 핵심 요약\n${analysis.summary}\n\n`;

  if (analysis.studyContent) {
    content += analysis.studyContent.replace(/^##\s/gm, '■ ').replace(/^###\s/gm, '▸ ').replace(/^- \[[ x]\]\s/gm, '☐ ').replace(/^- /gm, '• ') + '\n\n';
  } else if (analysis.reportSummary) {
    content += `■ 상세 학습 노트\n${analysis.reportSummary}\n\n`;
  }

  if (analysis.chapters.length > 0) {
    content += '■ 챕터별 정리\n';
    analysis.chapters.forEach((c, i) => { content += `${i + 1}. ${c.timestamp ? `[${c.timestamp}] ` : ''}${c.title}\n   ${c.summary}\n\n`; });
  }
  if (analysis.keywords.length > 0) { content += `■ 키워드: ${analysis.keywords.join(', ')}\n\n`; }
  if (analysis.transcript) { content += `${'='.repeat(60)}\n■ 전체 자막\n${'='.repeat(60)}\n${analysis.transcript}\n`; }

  const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 60)} - 학습노트.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printStudyContent(analysis: YoutubeAnalysisDTO) {
  const title = analysis.title || '학습 노트';
  const date = new Date().toLocaleDateString('ko-KR');
  const studyHtml = (analysis.studyContent || analysis.reportSummary || '')
    .replace(/^### (.+)$/gm, '<h3 style="margin:16px 0 8px;font-size:15px;font-weight:600">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:20px 0 10px;font-size:18px;font-weight:700">$1</h2>')
    .replace(/^- \[x\] (.+)$/gm, '<div style="margin:4px 0 4px 16px">☑ $1</div>')
    .replace(/^- \[ \] (.+)$/gm, '<div style="margin:4px 0 4px 16px">☐ $1</div>')
    .replace(/^- (.+)$/gm, '<div style="margin:3px 0 3px 16px">• $1</div>')
    .replace(/\n/g, '<br/>');

  const chaptersHtml = analysis.chapters.length > 0
    ? `<h2 style="margin:20px 0 10px;font-size:18px;font-weight:700">챕터별 정리</h2>` +
      analysis.chapters.map((c, i) => `<div style="margin:8px 0"><strong>${i + 1}. ${c.timestamp ? `[${c.timestamp}] ` : ''}${c.title}</strong><br/><span style="color:#555">${c.summary}</span></div>`).join('')
    : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} - 학습 노트</title>
<style>@page{margin:20mm 15mm}body{font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;font-size:13px;line-height:1.7;color:#222;max-width:720px;margin:0 auto;padding:20px}
h1{font-size:22px;margin-bottom:4px}
.meta{color:#888;font-size:12px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #333}
.summary{background:#f5f5f5;padding:16px;border-radius:8px;margin-bottom:20px}
.keywords span{display:inline-block;background:#e8e8e8;padding:2px 10px;border-radius:12px;font-size:12px;margin:3px 4px 3px 0}
.transcript{margin-top:24px;padding-top:16px;border-top:1px solid #ddd;font-size:12px;line-height:1.8;color:#555}
@media print{body{padding:0}.no-print{display:none}}</style></head>
<body>
<h1>${title}</h1>
<div class="meta">${analysis.channelTitle || ''} · ${date}</div>
<div class="summary"><strong>핵심 요약</strong><br/>${analysis.summary}</div>
${analysis.keywords.length > 0 ? `<div class="keywords" style="margin-bottom:16px"><strong>키워드</strong><br/>${analysis.keywords.map(k => `<span>${k}</span>`).join('')}</div>` : ''}
<div>${studyHtml}</div>
${chaptersHtml}
${analysis.transcript ? `<div class="transcript"><strong>전체 자막</strong><br/><br/>${analysis.transcript.replace(/\n/g, '<br/>')}</div>` : ''}
<script>window.onload=()=>window.print()</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

export function AnalysisResult({ analysis, pending, saved, onSave }: { analysis: YoutubeAnalysisDTO; pending?: boolean; saved?: boolean; onSave?: () => void }) {
  const [tab, setTab] = useState<'study' | 'transcript'>('study');
  return <div className="mt-6 space-y-4">
    <Card className="gap-4 p-5 md:flex-row">
      {analysis.thumbnailUrl && <img src={analysis.thumbnailUrl} alt="" className="aspect-video w-full rounded-md object-cover md:w-56" />}
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{analysis.category || '분석 중'}</Badge>{analysis.transcriptSource && <Badge variant="outline">자막: {analysis.transcriptSource}</Badge>}</div><h2 className="mt-2 text-xl font-bold">{analysis.title || '영상 정보를 가져오는 중입니다'}</h2>{analysis.channelTitle && <p className="mt-1 text-sm text-muted-foreground">{analysis.channelTitle}</p>}{pending && <p className="mt-3 flex items-center gap-2 text-sm text-primary"><Loader2 className="size-4 animate-spin" />자막과 학습 노트를 만들고 있습니다.</p>}{analysis.status === 'done' && <div className="mt-4 flex flex-wrap gap-2">{onSave && <Button size="sm" variant="outline" onClick={onSave}><Bookmark className="size-4" />{saved ? '저장됨' : '내 프로젝트에 저장'}</Button>}<Button size="sm" variant="outline" onClick={() => printStudyContent(analysis)}><FileText className="size-3.5" />PDF / 인쇄</Button><Button size="sm" variant="outline" onClick={() => generateStudyPdf(analysis)}><Download className="size-3.5" />텍스트 다운로드</Button></div>}</div>
    </Card>
    {analysis.qualityWarning && <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300">{analysis.qualityWarning}</Card>}
    {analysis.status === 'done' && <>
      <Card className="p-5"><h3 className="font-semibold">핵심 요약</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{analysis.summary}</p>{analysis.keywords.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{analysis.keywords.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}</div>}</Card>
      <div className="flex items-center gap-1 border-b">
        <button onClick={() => setTab('study')} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'study' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>학습 가이드</button>
        <button onClick={() => setTab('transcript')} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'transcript' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>전체 자막</button>
      </div>
      {tab === 'study' && <>
        {(analysis.studyContent || analysis.reportSummary) && <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">학습 가이드</h3>
            <CopyButton text={analysis.studyContent || analysis.reportSummary} label="내용 복사" />
          </div>
          <div className="mt-3">{analysis.studyContent ? renderMarkdown(analysis.studyContent) : <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{analysis.reportSummary}</p>}</div>
        </Card>}
        {analysis.chapters.length > 0 && <Card className="p-5"><h3 className="font-semibold">챕터별 정리</h3><div className="mt-3 space-y-3">{analysis.chapters.map((c, i) => <div key={`${c.title}-${i}`}><p className="text-sm font-medium">{c.timestamp ? `${c.timestamp} · ` : ''}{c.title}</p><p className="mt-1 text-sm text-muted-foreground">{c.summary}</p></div>)}</div></Card>}
      </>}
      {tab === 'transcript' && analysis.transcript && <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">전체 자막</h3>
          <CopyButton text={analysis.transcript} label="자막 복사" />
        </div>
        <p className="mt-3 max-h-[600px] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{analysis.transcript}</p>
      </Card>}
      {tab === 'transcript' && !analysis.transcript && <Card className="p-5 text-center text-sm text-muted-foreground">자막을 확보하지 못한 영상입니다.</Card>}
    </>}
  </div>;
}
