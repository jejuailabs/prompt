'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, GraduationCap, ListVideo, Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import type { AcademyPlaylistDTO } from '@/lib/types';
import { EmptyState } from '@/components/shared/empty-state';
import { ViewHeader } from '@/components/shared/view-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AnalysisResult } from '@/components/youtube-summary-tool';

export default function AcademyView() {
  const session = useAppStore((s) => s.session);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const qc = useQueryClient();
  const playlists = useQuery({ queryKey: ['academy', 'playlists'], queryFn: () => api.get<AcademyPlaylistDTO[]>('/api/academy/playlists') });
  const selected = playlists.data?.find((p) => p.id === selectedId) ?? playlists.data?.[0] ?? null;
  const selectedVideo = selected?.videos.find((v) => v.id === selectedVideoId) ?? selected?.videos[0] ?? null;
  const createPlaylist = async () => { if (!newTitle.trim()) { setAdminError('강의 과정 이름을 입력해주세요.'); return; } try { setAdminError(null); await api.post('/api/academy/playlists', { title: newTitle, description: newDescription }); setNewTitle(''); setNewDescription(''); await qc.invalidateQueries({ queryKey: ['academy'] }); } catch (e) { setAdminError(e instanceof Error ? e.message : '과정을 만들 수 없습니다.'); } };
  const addVideo = async () => { if (!selected || !videoUrl.trim()) { setAdminError('YouTube 영상 URL을 입력해주세요.'); return; } try { setAdminError(null); await api.post(`/api/academy/playlists/${selected.id}/videos`, { url: videoUrl, sortOrder: selected.videos.length + 1 }); setVideoUrl(''); await qc.invalidateQueries({ queryKey: ['academy'] }); } catch (e) { setAdminError(e instanceof Error ? e.message : '영상을 추가할 수 없습니다.'); } };
  return <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
    <ViewHeader title="가이드 & 튜토리얼" subtitle="관리자가 설계한 순서대로, 영상과 학습 노트를 따라가세요" actions={<Button variant="outline" onClick={() => window.open('/youtube-summary', '_blank', 'noopener,noreferrer')}><ExternalLink className="size-4" />YouTube 영상 요약하기</Button>} />
    {playlists.isLoading && <div className="h-20 animate-pulse rounded-xl bg-muted" />}
    {playlists.isError && <EmptyState title="강의 과정을 불러오지 못했습니다" action={<Button onClick={() => void playlists.refetch()}>다시 시도</Button>} />}
    {!playlists.isLoading && !playlists.isError && (playlists.data?.length ?? 0) === 0 && <EmptyState icon={<GraduationCap className="size-5" />} title="아직 공개된 강의 과정이 없습니다" description="관리자가 첫 커리큘럼을 준비하고 있습니다." />}
    {(playlists.data?.length ?? 0) > 0 && <><div className="mb-6 flex flex-wrap gap-2">{playlists.data!.map((p) => <Button key={p.id} variant={selected?.id === p.id ? 'default' : 'outline'} onClick={() => { setSelectedId(p.id); setSelectedVideoId(null); }}>{p.title}</Button>)}</div>{selected && <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><div><div className="aspect-video overflow-hidden rounded-xl bg-black"><iframe key={selectedVideo?.id} className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${selectedVideo?.videoId ?? ''}`} title={selectedVideo?.title ?? selected.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div><h2 className="mt-4 text-2xl font-bold">{selectedVideo?.title ?? selected.title}</h2><p className="mt-1 text-muted-foreground">{selectedVideo?.description || selected.description}</p>{selectedVideo?.analysis && <AnalysisResult analysis={selectedVideo.analysis} />}</div><Card className="h-fit p-3"><div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold"><ListVideo className="size-4" />강의 목록</div><div className="space-y-1">{selected.videos.map((v, i) => <button key={v.id} className={`flex w-full gap-3 rounded-md p-2 text-left hover:bg-muted ${selectedVideo?.id === v.id ? 'bg-primary/10' : ''}`} onClick={() => setSelectedVideoId(v.id)}><span className="pt-1 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>{v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="h-12 w-20 rounded object-cover" />}<span className="min-w-0"><span className="line-clamp-1 text-sm font-medium">{v.title}</span><span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{v.analysis?.summary || v.description || '영상 분석을 준비 중입니다.'}</span></span></button>)}</div></Card></section>}</>}
    {session?.role === 'admin' && <Card className="mt-10 border-dashed p-5"><p className="font-semibold">커리큘럼 관리</p><div className="mt-3 grid gap-2 md:grid-cols-2"><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="새 강의 과정 이름" /><Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="과정 한 줄 설명" /></div><Button className="mt-2" size="sm" onClick={() => void createPlaylist()}><Plus className="size-4" />과정 만들기</Button>{selected && <div className="mt-5 border-t pt-4"><p className="mb-2 text-sm font-medium">{selected.title}에 영상 추가 · 추가하면 자막/요약 분석을 자동 시작합니다</p><div className="flex gap-2"><Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube 영상 URL" /><Button size="sm" onClick={() => void addVideo()}>추가 및 요약</Button></div></div>}{adminError && <p className="mt-3 text-sm text-destructive">{adminError}</p>}</Card>}
  </div>;
}
