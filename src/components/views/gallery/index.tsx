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
import { AdSlot } from '@/components/experience/ad-slot';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type SortKey = 'new' | 'popular' | 'forked';

// DB stores Korean category strings — display label is locale-dependent.
const CATEGORY_EN: Record<string, string> = {
  이미지: 'Image',
  영상: 'Video',
  음악: 'Music',
  코딩: 'Coding',
  마케팅: 'Marketing',
  게임: 'Game',
  기타: 'Other',
};

const CATEGORY_KEYS = ['catImage', 'catVideo', 'catMusic', 'catCoding', 'catMarketing', 'catGame', 'catOther'] as const;
const CATEGORY_VALUES = ['이미지', '영상', '음악', '코딩', '마케팅', '게임', '기타'] as const;

function ListSkeleton() {
  return <div className="works-grid" aria-label="불러오는 중">{[0,1,2,3].map(n => <div key={n} className="work-skeleton animate-pulse" />)}</div>;
}

const CATEGORY_COLORS: Record<string, string> = {
  이미지: 'from-pink-500/20 to-violet-500/20',
  영상: 'from-blue-500/20 to-cyan-500/20',
  음악: 'from-fuchsia-500/20 to-amber-500/20',
  코딩: 'from-emerald-500/20 to-teal-500/20',
  마케팅: 'from-orange-500/20 to-amber-500/20',
  게임: 'from-purple-500/20 to-indigo-500/20',
  기타: 'from-slate-500/20 to-gray-500/20',
};

const CATEGORY_ICONS: Record<string, string> = {
  이미지: '🎨', 영상: '🎬', 음악: '🎵', 코딩: '💻', 마케팅: '📊', 게임: '🎮', 기타: '✨',
};

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
  const gradient = CATEGORY_COLORS[prompt.category] ?? CATEGORY_COLORS['기타'];
  const emoji = CATEGORY_ICONS[prompt.category] ?? '✨';
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
      className="cursor-pointer gap-0 overflow-hidden p-0 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {prompt.thumbnailUrl ? (
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          <img src={prompt.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className={`flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
          <span className="text-4xl">{emoji}</span>
        </div>
      )}
      <div className="p-4">
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
  const [tab, setTab] = useState<'prompts' | 'artifacts'>(params.tab === 'prompts' ? 'prompts' : 'artifacts');
  const [artifactType, setArtifactType] = useState(params.type ?? '');
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
    queryKey: ['artifacts', 'gallery', artifactSort, q, artifactType],
    queryFn: () => api.get<ArtifactDTO[]>(`/api/artifacts?scope=feed&sort=${artifactSort}&q=${encodeURIComponent(q)}&type=${artifactType}`),
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
    <div className="editorial-page">
      <ViewHeader eyebrow="THE OPEN GALLERY / PLAYLAB" title={locale === 'en' ? 'A little out of the ordinary.' : '조금 다른 상상들이 모이는 곳.'} subtitle={locale === 'en' ? 'Watch it. Play it. Find out how it was made.' : '감상하고, 직접 써보고, 어떻게 만들었는지 이야기해요.'} actions={<Button onClick={() => setCreateOpen(true)}>{t('writePrompt')} ↗</Button>} />
      {/* controls + tab panels share one Tabs root (Radix requires TabsContent inside Tabs) */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'prompts' | 'artifacts')}>
        <div className="gallery-controls flex flex-wrap items-center gap-3">
          <Input
            value={q}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="w-64"
          />
          <TabsList>
            <TabsTrigger value="prompts">{t('tabPrompts')}</TabsTrigger>
            <TabsTrigger value="artifacts">{locale === 'en' ? 'Works' : '작품'}</TabsTrigger>
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
          <div className="flex w-full flex-wrap items-center gap-2">{tab === 'prompts' ? categoryChips : [['','전체'],['image','이미지'],['video','영상'],['audio','음악'],['3d_asset','3D'],['game','게임'],['app','앱'],['landing_page','웹페이지']].map(([value,label]) => <Button key={value} size="sm" variant={artifactType === value ? 'secondary' : 'ghost'} onClick={() => setArtifactType(value)}>{locale === 'en' ? (value || 'All') : label}</Button>)}</div>
        </div>

        {/* prompts tab */}
        <TabsContent value="prompts" className="mt-0">
          {prompts.isLoading && <ListSkeleton />}
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
          {artifacts.isLoading && <ListSkeleton />}
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
            <div className="works-grid">
              {artifacts.data!.map((a) => (
                <ArtifactCard key={a.id} artifact={a} onClick={() => navigate('project', { id: a.id })} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AdSlot />
      <CreatePromptDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
