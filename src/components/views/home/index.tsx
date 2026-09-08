'use client';

// 전시실 (home) — hero, quick actions, monthly usage, today's picks (docs/09 §3)
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { QUICK_ACTIONS } from '@/lib/quick-actions';
import type { ArtifactDTO, CreditStateDTO, ViewKey } from '@/lib/types';
import { ArtifactCard } from '@/components/shared/artifact-card';
import { CreatePromptDialog } from '@/components/shared/create-prompt-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { Icon } from '@/components/layout/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
function FeedSkeleton() {
  return null;
}

export default function HomeView() {
  const t = useTranslations('home');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const session = useAppStore((s) => s.session);

  const [createOpen, setCreateOpen] = useState(false);

  const num = (n: number) => n.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR');

  const credits = useQuery({
    queryKey: ['credits'],
    queryFn: () => api.get<CreditStateDTO>('/api/credits'),
    enabled: !!session,
  });

  const feed = useQuery({
    queryKey: ['feed', 'popular'],
    queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=feed&sort=popular&limit=12'),
  });

  const onQuickAction = (key: string) => {
    const action = QUICK_ACTIONS.find((a) => a.key === key);
    if (!action) return;
    if (action.kind === 'dialog') setCreateOpen(true);
    else if (action.view) navigate(action.view as ViewKey, action.params);
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
      {/* ── hero ─────────────────────────────────────────────── */}
      <section className="hero-glow relative mb-8 overflow-hidden rounded-xl border p-8 md:p-12">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              {t('heroTitle1')}
              <br />
              {t('heroTitle2')}
              <br />
              {t('heroTitle3')}
            </h1>
            <p className="mt-4 text-muted-foreground">{tc('tagline')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setCreateOpen(true)}>
                {t('makeProject')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('lab')}>
                {t('openLab')}
              </Button>
            </div>
          </div>

          <div className="relative hidden justify-center md:flex">
            {/* decorative blur circles */}
            <div className="absolute -left-6 top-2 size-40 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
            <div className="absolute -right-4 bottom-0 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <img
                src="/uploads/seed/hero-illustration.png"
                alt={t('heroImgAlt')}
                className="relative max-h-80 rounded-2xl shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── quick actions ────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold">{tc('quickActionsTitle')}</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-6">
          {QUICK_ACTIONS.map((action) => (
            <Card
              key={action.key}
              role="button"
              tabIndex={0}
              onClick={() => onQuickAction(action.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onQuickAction(action.key);
                }
              }}
              className="cursor-pointer p-4 text-center transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Icon name={action.icon} className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 text-xs">{locale === 'en' ? action.en : action.ko}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── monthly usage (logged in only) ───────────────────── */}
      {session && credits.data && (
        <section className="mb-8">
          <Card className="flex-row items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{tc('monthlyUsage')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {num(credits.data.monthlyUsed)} / {num(credits.data.monthlyLimit)}
              </p>
            </div>
            <Progress
              value={Math.min(100, (credits.data.monthlyUsed / Math.max(1, credits.data.monthlyLimit)) * 100)}
              className="hidden w-40 sm:block"
            />
            <Button variant="ghost" size="sm" onClick={() => navigate('revenue')}>
              {tc('charge')}
            </Button>
          </Card>
        </section>
      )}

      {/* ── today's picks ────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('recommended')}</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('gallery')}>
            {tc('seeAll')} →
          </Button>
        </div>

        {feed.isLoading && <FeedSkeleton />}
        {feed.isError && (
          <EmptyState
            title={t('loadError')}
            action={
              <Button variant="outline" size="sm" onClick={() => void feed.refetch()}>
                {tc('retry')}
              </Button>
            }
          />
        )}
        {!feed.isLoading && !feed.isError && (feed.data?.length ?? 0) === 0 && (
          <EmptyState title={t('feedEmptyTitle')} description={t('feedEmptyDesc')} />
        )}
        {(feed.data?.length ?? 0) > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {feed.data!.map((a) => (
              <ArtifactCard key={a.id} artifact={a} onClick={() => navigate('project', { id: a.id })} />
            ))}
          </div>
        )}
      </section>

      <CreatePromptDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
