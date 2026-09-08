'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ExternalLink, Zap } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useSession } from '@/hooks/use-session';
import type { PipelineDTO, RunDTO } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/layout/icon';
import { EmptyState } from '@/components/shared/empty-state';
import { ViewHeader } from '@/components/shared/view-header';
import { cn } from '@/lib/utils';

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return String(e);
}

export default function PipelinesView() {
  const t = useTranslations('pipelines');
  const tc = useTranslations('core');
  const session = useSession();
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');

  const pipelinesQ = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.get<PipelineDTO[]>('/api/pipelines'),
  });
  const pipelines = pipelinesQ.data ?? [];
  const nameOf = (p?: PipelineDTO) => (p ? (locale === 'ko' ? p.displayNameKo : p.displayNameEn) : '');

  const runsQ = useQuery({
    queryKey: ['pipeline-runs', 'mine'],
    queryFn: () => api.get<RunDTO[]>('/api/pipeline-runs?scope=mine'),
    enabled: !!session,
  });
  const runs = [...(runsQ.data ?? [])].sort((x, y) => y.createdAt.localeCompare(x.createdAt));

  return (
    <div className="min-w-0">
      <ViewHeader title={t('title')} subtitle={t('subtitle')} />

      {/* pipeline cards */}
      {pipelinesQ.isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : pipelinesQ.isError ? (
        <EmptyState
          title={tc('error')}
          description={errMsg(pipelinesQ.error)}
          action={
            <Button variant="outline" size="sm" onClick={() => void pipelinesQ.refetch()}>
              {tc('retry')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {pipelines.map((p) => {
            const name = locale === 'ko' ? p.displayNameKo : p.displayNameEn;
            const desc = locale === 'ko' ? p.descKo : p.descEn;
            return (
              <Card
                key={p.id}
                className={cn('p-6', p.wide && 'md:col-span-2 md:flex md:items-center md:gap-6')}
              >
                <div
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15',
                    p.wide && 'shrink-0',
                  )}
                >
                  <Icon name={p.icon} className="h-7 w-7 text-primary" />
                </div>
                <div className={cn('min-w-0 flex-1', p.wide ? 'md:mt-0' : 'mt-4')}>
                  <h3 className="text-lg font-semibold">{name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{desc}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="outline">
                      <Zap /> {t('creditsBadge', { n: p.creditCost })}
                    </Badge>
                    <span className="flex-1" />
                    <Button size="sm" onClick={() => navigate('pipeline-run', { id: p.id })}>
                      {tc('start')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* my runs */}
      {session && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{t('myRuns')}</h2>
          {runsQ.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : runs.length ? (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {runs.map((r) => {
                const p = pipelines.find((x) => x.id === r.pipelineId);
                return (
                  <Card key={r.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{nameOf(p) || r.pipelineId}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</p>
                    </div>
                    <Badge
                      variant={r.status === 'running' ? 'secondary' : 'outline'}
                      className={cn(
                        r.status === 'done' && 'border-emerald-500/40 text-emerald-500',
                        r.status === 'failed' && 'border-red-500/40 text-red-500',
                      )}
                    >
                      {r.status === 'running' ? t('statusRunning') : r.status === 'done' ? t('statusDone') : t('statusFailed')}
                    </Badge>
                    {r.status === 'done' && r.resultArtifact && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 px-2"
                        onClick={() => navigate('project', { id: r.resultArtifact!.id })}
                      >
                        {r.resultArtifact.fileUrl && (
                          <img
                            src={r.resultArtifact.fileUrl}
                            alt={r.resultArtifact.title}
                            loading="lazy"
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <ExternalLink className="size-4 text-muted-foreground" />
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState title={t('noRuns')} description={t('noRunsDesc')} className="py-8" />
          )}
        </section>
      )}
    </div>
  );
}
