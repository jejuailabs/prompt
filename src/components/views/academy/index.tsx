'use client';

// 가이드 & 튜토리얼 — academy module lessons (featured + numbered list)
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Eye, GraduationCap, Heart } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import type { ArtifactDTO } from '@/lib/types';
import { EmptyState } from '@/components/shared/empty-state';
import { ViewHeader } from '@/components/shared/view-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function LessonCard({
  lesson,
  index,
  locale,
  onOpen,
}: {
  lesson: ArtifactDTO;
  index: number;
  locale: string;
  onOpen: () => void;
}) {
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
      className="cursor-pointer flex-row gap-4 p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold tabular-nums text-primary">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 font-medium">{lesson.title}</h3>
        {lesson.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{lesson.description}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">{num(lesson.views)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">{num(lesson.likeCount)}</span>
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function AcademyView() {
  const t = useTranslations('academy');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);

  const lessons = useQuery({
    queryKey: ['academy'],
    queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?moduleId=academy&sort=popular'),
  });

  const featured = lessons.data?.[0];
  const rest = lessons.data?.slice(1) ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
      <ViewHeader title={t('title')} subtitle={t('subtitle')} />

      {lessons.isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-xl md:col-span-2" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      {lessons.isError && (
        <EmptyState
          title={t('loadError')}
          action={
            <Button variant="outline" size="sm" onClick={() => void lessons.refetch()}>
              {tc('retry')}
            </Button>
          }
        />
      )}

      {!lessons.isLoading && !lessons.isError && (lessons.data?.length ?? 0) === 0 && (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      )}

      {(lessons.data?.length ?? 0) > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* featured lesson */}
          {featured && (
            <Card className="gap-4 p-6 md:col-span-2 md:flex md:items-center md:gap-6">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <GraduationCap className="size-8 text-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold">{featured.title}</h2>
                {featured.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{featured.description}</p>
                )}
                <div className="mt-4">
                  <Button size="sm" onClick={() => navigate('project', { id: featured.id })}>
                    {t('startLearning')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* remaining lessons */}
          {rest.map((lesson, i) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={i + 2}
              locale={locale}
              onOpen={() => navigate('project', { id: lesson.id })}
            />
          ))}
        </div>
      )}

      {/* bottom hint */}
      {(lessons.data?.length ?? 0) > 0 && (
        <Card className={cn('mt-6 items-center border-dashed p-4 text-center')}>
          <p className="text-sm text-muted-foreground">{t('moreComing')}</p>
        </Card>
      )}
    </div>
  );
}
