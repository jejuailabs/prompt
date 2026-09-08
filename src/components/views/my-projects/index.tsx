'use client';

// 내 프로젝트 — published/drafts/my prompts management (docs/09 §4)
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Heart, Trash2, Upload, User } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { ArtifactDTO, PromptDTO } from '@/lib/types';
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
      </Tabs>

      <UploadArtifactDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
