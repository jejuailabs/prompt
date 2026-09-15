'use client';

// 내 프로젝트 — published/drafts/my prompts management (docs/09 §4)
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Clapperboard, Heart, Loader2, Trash2, Upload, User, Film, CheckCircle2, XCircle, Play } from 'lucide-react';
import { api } from '@/lib/api-client';
import { CancelVideo } from '@/components/shared/cancel-video';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { ArtifactDTO, PromptDTO, YoutubeAnalysisDTO } from '@/lib/types';
import { ArtifactCard } from '@/components/shared/artifact-card';
import { EmptyState } from '@/components/shared/empty-state';
import { UploadArtifactDialog } from '@/components/shared/upload-artifact-dialog';
import { ViewHeader } from '@/components/shared/view-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CATEGORY_EN: Record<string, string> = {
  이미지: 'Image',
  영상: 'Video',
  코딩: 'Coding',
  마케팅: 'Marketing',
  게임: 'Game',
  기타: 'Other',
};

function GridSkeleton() {
  return null;
}

export default function MyProjectsView() {
  const t = useTranslations('myProjects');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const session = useAppStore((s) => s.session);
  const setLoginOpen = useAppStore((s) => s.setLoginOpen);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState('published');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const artifacts = useQuery({
    queryKey: ['artifacts', 'mine'],
    queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=mine'),
    enabled: !!session,
  });

  const prompts = useQuery({
    queryKey: ['prompts', 'mine'],
    queryFn: () => api.get<PromptDTO[]>('/api/prompts?scope=mine'),
    enabled: !!session,
  });

  const savedYoutube = useQuery({
    queryKey: ['youtube', 'saved'],
    queryFn: () => api.get<YoutubeAnalysisDTO[]>('/api/youtube/saved'),
    enabled: !!session,
  });

  const videoProjects = useQuery({
    queryKey: ['video-studio-projects'],
    queryFn: () => api.get<ArtifactDTO[]>('/api/video-studio/projects'),
    enabled: !!session,
  });

  const catLabel = (c: string) => (locale === 'en' ? CATEGORY_EN[c] ?? c : c);
  const num = (n: number) => n.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR');

  const toastError = (e: unknown) =>
    toast({ title: e instanceof Error ? e.message : tc('error'), variant: 'destructive' });

  const published = (artifacts.data ?? []).filter((a) => a.status === 'published');
  const drafts = (artifacts.data ?? []).filter((a) => a.status === 'draft');

  const publishDraft = async (a: ArtifactDTO) => {
    setPendingId(a.id);
    try {
      await api.patch(`/api/artifacts/${a.id}`, { status: 'published' });
      await qc.invalidateQueries({ queryKey: ['artifacts'] });
      toast({ title: t('publishedToast') });
    } catch (e) {
      toastError(e);
    } finally {
      setPendingId(null);
    }
  };

  const deleteDraft = async (a: ArtifactDTO) => {
    setPendingId(a.id);
    try {
      await api.del(`/api/artifacts/${a.id}`);
      await qc.invalidateQueries({ queryKey: ['artifacts'] });
      toast({ title: tc('deleted') });
    } catch (e) {
      toastError(e);
    } finally {
      setPendingId(null);
    }
  };

  // ── logged out ────────────────────────────────────────────
  if (!session) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
        <EmptyState
          icon={<User className="size-5" aria-hidden="true" />}
          title={t('needLoginTitle')}
          description={t('needLoginDesc')}
          action={
            <Button size="sm" onClick={() => setLoginOpen(true)}>
              {tc('login')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
      <ViewHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" aria-hidden="true" />
            {t('upload')}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="published">{t('tabPublished')}</TabsTrigger>
          <TabsTrigger value="drafts">{t('tabDrafts')}</TabsTrigger>
          <TabsTrigger value="prompts">{t('tabPrompts')}</TabsTrigger>
          <TabsTrigger value="video-studio">{t('tabVideoStudio')}</TabsTrigger>
          <TabsTrigger value="youtube">영상 요약</TabsTrigger>
        </TabsList>

        {/* published */}
        <TabsContent value="published" className="mt-0">
          {artifacts.isLoading && <GridSkeleton />}
          {artifacts.isError && (
            <EmptyState
              title={t('loadError')}
              action={
                <Button variant="outline" size="sm" onClick={() => void artifacts.refetch()}>
                  {tc('retry')}
                </Button>
              }
            />
          )}
          {!artifacts.isLoading && !artifacts.isError && published.length === 0 && (
            <EmptyState title={t('emptyPublishedTitle')} description={t('emptyPublishedDesc')} />
          )}
          {published.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {published.map((a) => (
                <ArtifactCard key={a.id} artifact={a} onClick={() => navigate('project', { id: a.id })} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* drafts */}
        <TabsContent value="drafts" className="mt-0">
          {artifacts.isLoading && <GridSkeleton />}
          {artifacts.isError && (
            <EmptyState
              title={t('loadError')}
              action={
                <Button variant="outline" size="sm" onClick={() => void artifacts.refetch()}>
                  {tc('retry')}
                </Button>
              }
            />
          )}
          {!artifacts.isLoading && !artifacts.isError && drafts.length === 0 && (
            <EmptyState title={t('emptyDraftsTitle')} description={t('emptyDraftsDesc')} />
          )}
          {drafts.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {drafts.map((a) => (
                <div key={a.id} className="space-y-2">
                  <ArtifactCard artifact={a} />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 flex-1 px-2 text-xs"
                      onClick={() => void publishDraft(a)}
                      disabled={pendingId === a.id}
                    >
                      {tc('publish')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => void deleteDraft(a)}
                      disabled={pendingId === a.id}
                      aria-label={tc('delete')}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      {tc('delete')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* my prompts */}
        <TabsContent value="prompts" className="mt-0">
          {prompts.isLoading && null}
          {prompts.isError && (
            <EmptyState
              title={t('loadError')}
              action={
                <Button variant="outline" size="sm" onClick={() => void prompts.refetch()}>
                  {tc('retry')}
                </Button>
              }
            />
          )}
          {!prompts.isLoading && !prompts.isError && (prompts.data?.length ?? 0) === 0 && (
            <EmptyState title={t('emptyPromptsTitle')} description={t('emptyPromptsDesc')} />
          )}
          {(prompts.data?.length ?? 0) > 0 && (
            <div className="space-y-3">
              {prompts.data!.map((p) => (
                <Card
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate('prompt', { id: p.id })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate('prompt', { id: p.id });
                    }
                  }}
                  className="cursor-pointer flex-row items-center justify-between gap-4 p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 font-medium">{p.title}</h3>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {catLabel(p.category)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">@{p.owner?.username}</span>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="size-3.5" aria-hidden="true" />
                    <span className="tabular-nums">{num(p.likeCount)}</span>
                  </span>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="video-studio" className="mt-0">
          {videoProjects.isLoading && <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}
          {videoProjects.isError && (
            <EmptyState
              title={t('loadError')}
              action={
                <Button variant="outline" size="sm" onClick={() => void videoProjects.refetch()}>
                  {tc('retry')}
                </Button>
              }
            />
          )}
          {!videoProjects.isLoading && !videoProjects.isError && (videoProjects.data?.length ?? 0) === 0 && (
            <EmptyState
              icon={<Film className="size-5" aria-hidden="true" />}
              title={t('emptyVideoTitle')}
              description={t('emptyVideoDesc')}
              action={
                <Button size="sm" onClick={() => navigate('video-studio', { studio: 'quick' })}>
                  <Clapperboard className="size-4" /> 첫 영상 만들기
                </Button>
              }
            />
          )}
          {(videoProjects.data?.length ?? 0) > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videoProjects.data!.map((project) => (
                <VideoProjectCard
                  key={project.id}
                  project={project}
                  locale={locale}
                  onOpen={() => navigate('video-studio', { studio: 'workspace', project: project.id })}
                  t={t}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="youtube" className="mt-0">
          {savedYoutube.isError && <EmptyState title="저장한 영상 요약을 불러오지 못했습니다" />}
          {!savedYoutube.isLoading && !savedYoutube.isError && (savedYoutube.data?.length ?? 0) === 0 && (
            <EmptyState title="저장한 영상 요약이 없습니다" description="YouTube 영상 요약하기에서 분석한 내용을 저장해보세요." />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {(savedYoutube.data ?? []).map((video) => (
              <Card key={video.id} className="gap-3 p-4">
                <div className="flex gap-3">
                  {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="h-16 w-28 rounded object-cover" />}
                  <div className="min-w-0"><h3 className="line-clamp-2 font-medium">{video.title}</h3><p className="mt-1 text-xs text-muted-foreground">{video.channelTitle}</p></div>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{video.summary}</p>
                <a className="text-sm font-medium text-primary hover:underline" href={`/youtube-summary?analysis=${video.id}`} target="_blank" rel="noreferrer">요약 다시 보기</a>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <UploadArtifactDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

interface VideoMeta {
  prompt?: string;
  style?: string;
  targetDurationSec?: number;
  inputMode?: string;
  inputImageUrl?: string | null;
  aspectRatio?: string;
  quality?: string;
  engine?: string;
  projectStatus?: string;
  render?: { engine?: string; status?: string; videoUrl?: string | null; queuedAt?: string; completedAt?: string };
  shots?: Array<{ id: string; duration: number }>;
}

function VideoProjectCard({ project, locale, onOpen, t }: { project: ArtifactDTO; locale: string; onOpen: () => void; t: (key: string) => string }) {
  const meta = project.metadata as unknown as VideoMeta;
  const storedStatus = meta.render?.status ?? meta.projectStatus ?? 'editing';
  const pending = ['IN_QUEUE', 'IN_PROGRESS', 'QUEUED', 'RUNNING', 'rendering'].includes(storedStatus);
  const statusQuery = useQuery({
    queryKey: ['video-studio-render-status', project.id],
    queryFn: () => api.get<{ status: string; videoUrl?: string | null }>(`/api/video-studio/projects/${project.id}/render/status`),
    enabled: pending,
    retry: false,
    refetchInterval: q => q.state.status === 'error' || ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(q.state.data?.status ?? '') ? false : 15000,
  });
  const renderStatus = statusQuery.data?.status ?? storedStatus;
  const videoUrl = statusQuery.data?.videoUrl ?? meta.render?.videoUrl ?? project.fileUrl ?? null;
  const engine = (meta.render?.engine ?? meta.engine ?? 'H3').toUpperCase();
  const aspect = meta.aspectRatio ?? '9:16';
  const shotCount = meta.shots?.length ?? 1;
  const duration = meta.targetDurationSec ?? 6;
  const isUnconfirmed = pending && (statusQuery.isError || !statusQuery.data);
  const isRendering = !isUnconfirmed && ['IN_QUEUE', 'IN_PROGRESS', 'QUEUED', 'RUNNING', 'rendering'].includes(renderStatus);
  const isCompleted = renderStatus === 'COMPLETED' || renderStatus === 'completed';
  const isFailed = ['FAILED', 'CANCELLED', 'TIMED_OUT', 'failed'].includes(renderStatus);

  const statusLabel = isUnconfirmed ? (statusQuery.isError ? '상태 확인 불가' : '상태 확인 중') : renderStatus === 'CANCELLED' ? '생성 중지됨' : isRendering ? t('videoStatusRendering') : isCompleted ? t('videoStatusCompleted') : isFailed ? t('videoStatusFailed') : t('videoStatusEditing');
  const statusColor = isRendering ? 'text-blue-500' : isCompleted ? 'text-emerald-500' : isFailed ? 'text-destructive' : 'text-muted-foreground';
  const StatusIcon = isRendering ? Loader2 : isCompleted ? CheckCircle2 : isFailed ? XCircle : Clapperboard;

  const timeAgo = (iso?: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return locale === 'en' ? 'just now' : '방금';
    if (mins < 60) return locale === 'en' ? `${mins}m ago` : `${mins}분 전`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return locale === 'en' ? `${hrs}h ago` : `${hrs}시간 전`;
    const days = Math.floor(hrs / 24);
    return locale === 'en' ? `${days}d ago` : `${days}일 전`;
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="cursor-pointer gap-0 overflow-hidden p-0 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <div className="relative aspect-video bg-slate-900">
        {videoUrl && isCompleted ? (
          <video src={videoUrl} muted playsInline preload="metadata" className="size-full object-cover" />
        ) : meta.inputImageUrl ? (
          <img src={meta.inputImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-[radial-gradient(circle_at_65%_30%,rgba(124,58,237,.45),transparent_24%),linear-gradient(150deg,#0f172a,#1e1b4b_55%,#172554)]" />
        )}
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="size-8 animate-spin text-white" />
          </div>
        )}
        {isCompleted && videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
            <Play className="size-10 text-white" />
          </div>
        )}
        <Badge className="absolute left-2 top-2 border-0 bg-black/50 text-[10px] text-white hover:bg-black/50">
          {engine}
        </Badge>
        <span className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
          {aspect} · {duration}초
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold">{project.title}</h3>
        {(isRendering || isUnconfirmed) && <div className="my-2"><CancelVideo projectId={project.id} /></div>}
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{meta.prompt ?? project.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`size-3.5 ${statusColor} ${isRendering ? 'animate-spin' : ''}`} />
            <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{shotCount} 샷</span>
            {meta.render?.queuedAt && <span>{timeAgo(meta.render.completedAt ?? meta.render.queuedAt)}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
