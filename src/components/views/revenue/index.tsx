'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Clock, CreditCard, TrendingUp, Wallet } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';
import { ViewHeader } from '@/components/shared/view-header';
import type { Locale, RevenueOverviewDTO } from '@/lib/types';

// ─── formatting helpers ─────────────────────────────────────────────────────

const won = (n: number, locale: Locale) =>
  `₩${n.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR')}`;

// ─── view root ──────────────────────────────────────────────────────────────

export default function RevenueView() {
  const t = useTranslations('revenue');
  const tc = useTranslations('core');
  const session = useSession();
  const requireLogin = useAppStore((s) => s.requireLogin);

  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto w-full max-w-5xl"
      >
        <EmptyState
          icon={<Wallet className="size-5" />}
          title={t('loginRequired')}
          description={t('loginRequiredDesc')}
          action={
            <Button
              onClick={() => {
                if (!requireLogin()) return;
              }}
            >
              {tc('login')}
            </Button>
          }
        />
      </motion.div>
    );
  }

  return <RevenueContent />;
}

// ─── content ────────────────────────────────────────────────────────────────

function RevenueContent() {
  const t = useTranslations('revenue');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const qc = useQueryClient();
  const { toast } = useToast();

  const overviewQ = useQuery({
    queryKey: ['revenue'],
    queryFn: () => api.get<RevenueOverviewDTO>('/api/revenue'),
  });

  const connectM = useMutation({
    mutationFn: () => api.post('/api/revenue/connect', { provider: 'stripe_connect' }),
    onSuccess: () => {
      toast({ title: t('connectedToast') });
      void qc.invalidateQueries({ queryKey: ['revenue'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  if (overviewQ.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-16 w-72 rounded-md" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (overviewQ.isError || !overviewQ.data) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <ViewHeader title={t('title')} subtitle={t('subtitle')} />
        <EmptyState
          icon={<Wallet className="size-5" />}
          title={t('loadFailed')}
          action={
            <Button variant="outline" onClick={() => void overviewQ.refetch()}>
              {tc('retry')}
            </Button>
          }
        />
      </div>
    );
  }

  const data = overviewQ.data;
  const account = data.account;
  const last4 = account?.externalAccountId?.slice(-4) ?? '0000';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-5xl space-y-6"
    >
      <ViewHeader title={t('title')} subtitle={t('subtitle')} />

      {/* stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label={t('thisMonth')} value={won(data.totals.thisMonth, locale)} icon={<TrendingUp className="size-4" />} />
        <StatCard label={t('pending')} value={won(data.totals.pending, locale)} icon={<Clock className="size-4" />} sub={t('pendingSub')} />
        <StatCard label={t('lifetime')} value={won(data.totals.lifetime, locale)} icon={<Wallet className="size-4" />} />
      </div>

      {/* account card */}
      <Card className="flex flex-wrap items-center gap-4 p-6">
        {account ? (
          <>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CreditCard className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('accountLinked')}</p>
              <p className="text-xs text-muted-foreground">acct••••{last4}</p>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
              {t('accountActive')}
            </Badge>
          </>
        ) : (
          <>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CreditCard className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('connectTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('connectDemoNote')}</p>
            </div>
            <Button onClick={() => connectM.mutate()} disabled={connectM.isPending}>
              {t('connectBtn')}
            </Button>
          </>
        )}
      </Card>

      {/* monthly trend */}
      <Card className="p-6">
        <h2 className="font-semibold">{t('monthlyTrend')}</h2>
        <div className="mt-4 h-[220px] text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <YAxis width={44} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                formatter={(value: number | string) => won(Number(value), locale)}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* payout history */}
      <Card className="p-6">
        <h2 className="font-semibold">{t('historyTitle')}</h2>
        {data.shares.length === 0 ? (
          <EmptyState
            className="py-8"
            icon={<CreditCard className="size-5" />}
            title={t('emptyShares')}
            description={t('emptySharesDesc')}
          />
        ) : (
          <div className="mt-4 max-h-96 overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('thPeriod')}</TableHead>
                  <TableHead>{t('thArtifact')}</TableHead>
                  <TableHead>{t('thShare')}</TableHead>
                  <TableHead className="text-right">{t('thAmount')}</TableHead>
                  <TableHead>{t('thStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.shares.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">{s.period}</TableCell>
                    <TableCell className="max-w-56 truncate">{s.artifactTitle ?? '—'}</TableCell>
                    <TableCell>{s.sharePercent}%</TableCell>
                    <TableCell className="text-right tabular-nums">{won(s.amount, locale)}</TableCell>
                    <TableCell>
                      {s.status === 'settled' ? (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
                          {t('statusSettled')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t('statusPending')}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
