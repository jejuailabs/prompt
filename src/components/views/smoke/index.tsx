'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CreditCard,
  Download,
  Eye,
  Loader2,
  MousePointerClick,
  Percent,
  Radar,
  Sparkles,
  Target,
  UserPlus,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/layout/icon';
import { EmptyState } from '@/components/shared/empty-state';
import { ScoreGauge } from '@/components/shared/score-gauge';
import { StatCard } from '@/components/shared/stat-card';
import { ViewHeader } from '@/components/shared/view-header';
import type { ArtifactDTO, Locale, SmokeTestDTO } from '@/lib/types';

// ─── formatting helpers ─────────────────────────────────────────────────────

const won = (n: number, locale: Locale) =>
  `₩${n.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR')}`;

const fmtDate = (iso: string, locale: Locale) =>
  new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const fmtNum = (n: number, locale: Locale) =>
  n.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR', { maximumFractionDigits: 2 });

// ─── status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SmokeTestDTO['status'] }) {
  const t = useTranslations('smoke');
  if (status === 'completed') return <Badge>{t('statusCompleted')}</Badge>;
  if (status === 'running') return <Badge variant="secondary">{t('statusRunning')}</Badge>;
  if (status === 'approved')
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
        {t('statusApproved')}
      </Badge>
    );
  return <Badge variant="outline">{t('statusRequested')}</Badge>;
}

function scoreLabelKey(score: number): 'scoreVeryHigh' | 'scoreHigh' | 'scoreMedium' | 'scoreLow' {
  if (score >= 80) return 'scoreVeryHigh';
  if (score >= 65) return 'scoreHigh';
  if (score >= 50) return 'scoreMedium';
  return 'scoreLow';
}

// ─── view root ──────────────────────────────────────────────────────────────

export default function SmokeView() {
  const id = useAppStore((s) => s.params.id);
  return id ? <SmokeDetail id={id} /> : <SmokeList />;
}

// ─── list ───────────────────────────────────────────────────────────────────

const BUDGET_OPTIONS = [50_000, 100_000, 150_000];

function SmokeList() {
  const t = useTranslations('smoke');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const session = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [artifactId, setArtifactId] = useState('');
  const [budget, setBudget] = useState(BUDGET_OPTIONS[1]);

  const testsQ = useQuery({
    queryKey: ['smoke', 'mine'],
    queryFn: () => api.get<SmokeTestDTO[]>('/api/smoke-tests?scope=mine'),
    enabled: !!session,
  });

  const artifactsQ = useQuery({
    queryKey: ['artifacts', 'mine'],
    queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=mine'),
    enabled: open && !!session,
  });

  const published = (artifactsQ.data ?? []).filter((a) => a.status === 'published');

  const createM = useMutation({
    mutationFn: (body: { artifactId: string; budget: number; days: number }) =>
      api.post<SmokeTestDTO>('/api/smoke-tests', body),
    onSuccess: () => {
      toast({ title: t('requestedToast') });
      setOpen(false);
      setArtifactId('');
      void qc.invalidateQueries({ queryKey: ['smoke'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const openNew = () => {
    if (!requireLogin()) return;
    setOpen(true);
  };

  const submit = () => {
    if (!artifactId) return;
    createM.mutate({ artifactId, budget, days: 14 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-5xl"
    >
      <ViewHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button onClick={openNew}>
            <Radar className="size-4" />
            {t('newTest')}
          </Button>
        }
      />

      {!session ? (
        <EmptyState
          icon={<Radar className="size-5" />}
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
      ) : testsQ.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : testsQ.isError ? (
        <EmptyState
          title={t('loadFailed')}
          action={
            <Button variant="outline" onClick={() => void testsQ.refetch()}>
              {tc('retry')}
            </Button>
          }
        />
      ) : (testsQ.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Radar className="size-5" />}
          title={t('listEmptyTitle')}
          description={t('listEmptyDesc')}
          action={<Button onClick={openNew}>{t('newTest')}</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(testsQ.data ?? []).map((test) => (
            <Card
              key={test.id}
              className="cursor-pointer p-4 transition-shadow hover:shadow-md"
              onClick={() => navigate('smoke', { id: test.id })}
            >
              <div className="flex items-center gap-4">
                {test.artifact?.fileUrl ? (
                  <img
                    src={test.artifact.fileUrl}
                    alt={test.artifact.title}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon name="images" className="size-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{test.artifact?.title ?? '—'}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <StatusBadge status={test.status} />
                    <span>{won(test.budget, locale)}</span>
                    <span>·</span>
                    <span>{fmtDate(test.requestedAt, locale)}</span>
                  </div>
                </div>
                {test.report && (
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <ScoreGauge score={test.report.successScore} size={64} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => navigate('smoke', { id: test.id })}
                    >
                      {t('reportView')}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* request dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('requestTitle')}</DialogTitle>
            <DialogDescription>{t('requestDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('artifactLabel')}</Label>
              {published.length === 0 && !artifactsQ.isLoading ? (
                <p className="text-xs text-muted-foreground">{t('noArtifacts')}</p>
              ) : (
                <Select value={artifactId} onValueChange={setArtifactId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('artifactPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {published.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('budgetLabel')}</Label>
              <Select value={String(budget)} onValueChange={(v) => setBudget(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_OPTIONS.map((b) => (
                    <SelectItem key={b} value={String(b)}>
                      {won(b, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('daysLabel')}</Label>
              <Input value={t('daysFixed')} readOnly />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={submit} disabled={!artifactId || createM.isPending}>
              {createM.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── detail ─────────────────────────────────────────────────────────────────

function SmokeDetail({ id }: { id: string }) {
  const t = useTranslations('smoke');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const [tab, setTab] = useState('summary');

  const testQ = useQuery({
    queryKey: ['smoke', id],
    queryFn: () => api.get<SmokeTestDTO>(`/api/smoke-tests/${id}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && status !== 'completed' ? 1500 : false;
    },
  });

  if (testQ.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (testQ.isError || !testQ.data) {
    return (
      <EmptyState
        icon={<Radar className="size-5" />}
        title={testQ.isError ? t('loadFailed') : t('notFoundTitle')}
        description={testQ.isError ? undefined : t('notFoundDesc')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void testQ.refetch()}>
              {tc('retry')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('smoke')}>
              {t('backToList')}
            </Button>
          </div>
        }
      />
    );
  }

  const test = testQ.data;
  const report = test.report;
  const artifact = test.artifact;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-5xl space-y-4"
    >
      {/* header row */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => navigate('smoke')}
        >
          <ArrowLeft className="size-3.5" />
          {t('backToList')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="size-4" />
          {t('downloadPdf')}
        </Button>
      </div>

      {/* summary card */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex min-w-0 items-center gap-4">
            {artifact?.fileUrl ? (
              <img
                src={artifact.fileUrl}
                alt={artifact.title}
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon name="images" className="size-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{artifact?.title ?? '—'}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {artifact?.version && <Badge variant="outline">v{artifact.version}</Badge>}
                <StatusBadge status={test.status} />
              </div>
            </div>
          </div>

          <div className="min-w-52 space-y-1.5 text-sm">
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('period')}</span>
              <span className="tabular-nums">
                {fmtDate(test.requestedAt, locale)} ~{' '}
                {test.completedAt ? fmtDate(test.completedAt, locale) : t('ongoing')}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('budget')}</span>
              <span className="tabular-nums">{won(test.budget, locale)}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('channel')}</span>
              <span>{t('channelValue')}</span>
            </p>
          </div>

          {report && (
            <div className="ml-auto">
              <ScoreGauge score={report.successScore} label={t(scoreLabelKey(report.successScore))} />
            </div>
          )}
        </div>
      </Card>

      {/* running banner */}
      {(test.status === 'running' || test.status === 'approved') && !report && (
        <Card className="flex items-center gap-2 border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          {t('runningBanner')}
        </Card>
      )}

      {/* report tabs */}
      {report ? (
        <Tabs value={tab} onValueChange={setTab} defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">{t('tabSummary')}</TabsTrigger>
            <TabsTrigger value="traffic">{t('tabTraffic')}</TabsTrigger>
            <TabsTrigger value="suggestions">{t('tabSuggestions')}</TabsTrigger>
          </TabsList>

          {/* summary */}
          <TabsContent value="summary" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <StatCard label={t('impressions')} value={fmtNum(report.metrics.impressions, locale)} icon={<Eye className="size-4" />} />
                <StatCard label={t('clicks')} value={fmtNum(report.metrics.clicks, locale)} icon={<MousePointerClick className="size-4" />} />
                <StatCard label={t('ctr')} value={`${fmtNum(report.metrics.ctr, locale)}%`} icon={<Percent className="size-4" />} />
                <StatCard label={t('signups')} value={fmtNum(report.metrics.signups, locale)} icon={<UserPlus className="size-4" />} />
                <StatCard label={t('conversions')} value={fmtNum(report.metrics.conversions, locale)} icon={<CreditCard className="size-4" />} />
                <StatCard label={t('cac')} value={won(Math.round(report.metrics.cac), locale)} icon={<Target className="size-4" />} />
              </div>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">{t('insights')}</h3>
                </div>
                <ul className="mt-3 space-y-3">
                  {report.recommendation.map((rec, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="text-sm leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="link"
                  className="mt-2 h-auto p-0 text-sm"
                  onClick={() => setTab('suggestions')}
                >
                  {t('viewSuggestions')}
                </Button>
              </Card>
            </div>
          </TabsContent>

          {/* traffic */}
          <TabsContent value="traffic" className="mt-4">
            <Card className="p-6">
              <div className="h-[300px] text-muted-foreground">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.metrics.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                    <YAxis width={36} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number | string) => fmtNum(Number(value), locale)}
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="visitors" name={t('visitors')} stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="signups" name={t('chartSignups')} stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          {/* suggestions */}
          <TabsContent value="suggestions" className="mt-4">
            <div className="space-y-3">
              {report.recommendation.map((rec, i) => (
                <Card key={i} className="flex items-start gap-3 p-4">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed">{rec}</p>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        test.status === 'completed' && (
          <Card className="p-6 text-sm text-muted-foreground">{t('reportPending')}</Card>
        )
      )}
    </motion.div>
  );
}
