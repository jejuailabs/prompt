'use client';

// 갤러리 — prompt wiki browse: search / tabs / sort / category chips (docs/09 §4)
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { GitFork, Heart, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import type { ArtifactDTO, PromptDTO } from '@/lib/types';
import { ArtifactCard } from '@/components/shared/artifact-card';
import { CreatePromptDialog } from '@/components/shared/create-prompt-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ViewHeader } from '@/components/shared/view-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type SortKey = 'new' | 'popular' | 'forked';

// DB stores Korean category strings — display label is locale-dependent.
const CATEGORY_EN: Record<string, string> = {
  이미지: 'Image',
  영상: 'Video',
  코딩: 'Coding',
  마케팅: 'Marketing',
  게임: 'Game',
  기타: 'Other',
};

const CATEGORY_KEYS = ['catImage', 'catVideo', 'catCoding', 'catMarketing', 'catGame', 'catOther'] as const;
const CATEGORY_VALUES = ['이미지', '영상', '코딩', '마케팅', '게임', '기타'] as const;

function ListSkeleton({ cols }: { cols: string }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="gap-0 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-1/2" />
        </Card>
      ))}
    </div>
  );
}

function PromptCard({
  prompt,
  categoryLabel,
  onOpen,
}: {
  prompt: PromptDTO;
  categoryLabel: string;
  onOpen: () => void;
}) {
  const locale = useAppStore((s) => s.locale);
  const num = (n: number) => n.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR');
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer gap-0 p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <h3 className="line-clamp-1 font-semibold">{prompt.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{prompt.body}</p>
      <div className="mt-3 flex items-center gap-1.5">
        <Badge variant="secondary">{categoryLabel}</Badge>
        {prompt.modelTags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px]">
            {tag}
          </Badge>
        ))}
        <span className="min-w-2 flex-1" />
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Heart className="size-3.5" aria-hidden="true" />
          <span className="tabular-nums">{num(prompt.likeCount)}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="size-3.5" aria-hidden="true" />
          <span className="tabular-nums">{num(prompt.commentCount)}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <GitFork className="size-3.5" aria-hidden="true" />
          <span className="tabular-nums">{num(prompt.forkCount)}</span>
        </span>
      </div>
    </Card>
  );
}

export default function GalleryView() {
  const t = useTranslations('gallery');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const params = useAppStore((s) => s.params);

  const [createOpen, setCreateOpen] = useState(false);
  const [qInput, setQInput] = useState<string | null>(null);
  const [tab, setTab] = useState<'prompts' | 'artifacts'>(params.tab === 'artifacts' ? 'artifacts' : 'prompts');
  const [sort, setSort] = useState<SortKey>('new');
  const [category, setCategory] = useState<string>('');

  const q = qInput ?? params.q ?? '';
  const artifactSort = sort === 'forked' ? 'popular' : sort;

  const catLabel = (c: string) => (locale === 'en' ? CATEGORY_EN[c] ?? c : c);

  const prompts = useQuery({
    queryKey: ['prompts', sort, category, q],
    queryFn: () =>
      api.get<PromptDTO[]>(`/api/prompts?sort=${sort}&category=${encodeURIComponent(category)}&q=${encodeURIComponent(q)}`),
    enabled: tab === 'prompts',
  });

  const artifacts = useQuery({
    queryKey: ['artifacts', 'gallery', artifactSort, q],
    queryFn: () => api.get<ArtifactDTO[]>(`/api/artifacts?scope=feed&sort=${artifactSort}&q=${encodeURIComponent(q)}`),
    enabled: tab === 'artifacts',
  });

  const categoryChips = (
    <>
      <Button
        size="sm"
        variant={category === '' ? 'secondary' : 'outline'}
        onClick={() => setCategory('')}
      >
        {t('catAll')}
      </Button>
      {CATEGORY_KEYS.map((key, i) => (
        <Button
          key={key}
          size="sm"
          variant={category === CATEGORY_VALUES[i] ? 'secondary' : 'outline'}
          onClick={() => setCategory(CATEGORY_VALUES[i])}
        >
          {t(key)}
        </Button>
      ))}
    </>
  );

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
      <ViewHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            {t('writePrompt')}
          </Button>
        }
      />

      {/* controls + tab panels share one Tabs root (Radix requires TabsContent inside Tabs) */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'prompts' | 'artifacts')}>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Input
            value={q}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-64"
          />
          <TabsList>
            <TabsTrigger value="prompts">{t('tabPrompts')}</TabsTrigger>
            <TabsTrigger value="artifacts">{t('tabArtifacts')}</TabsTrigger>
          </TabsList>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">{t('sortNew')}</SelectItem>
              <SelectItem value="popular">{t('sortPopular')}</SelectItem>
              <SelectItem value="forked">{t('sortForked')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center gap-2">{categoryChips}</div>
        </div>

        {/* prompts tab */}
        <TabsContent value="prompts" className="mt-0">
          {prompts.isLoading && <ListSkeleton cols="sm:grid-cols-2 xl:grid-cols-3" />}
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {prompts.data!.map((p) => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  categoryLabel={catLabel(p.category)}
                  onOpen={() => navigate('prompt', { id: p.id })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* artifacts tab */}
        <TabsContent value="artifacts" className="mt-0">
          {artifacts.isLoading && <ListSkeleton cols="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />}
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
          {!artifacts.isLoading && !artifacts.isError && (artifacts.data?.length ?? 0) === 0 && (
            <EmptyState title={t('emptyArtifactsTitle')} description={t('emptyArtifactsDesc')} />
          )}
          {(artifacts.data?.length ?? 0) > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {artifacts.data!.map((a) => (
                <ArtifactCard key={a.id} artifact={a} onClick={() => navigate('project', { id: a.id })} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreatePromptDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
