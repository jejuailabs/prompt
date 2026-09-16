'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowDown, ArrowUp, BarChart3, CheckCircle, Circle, Clock, Coins, Film, Info, Loader2, Radar, ReceiptText, RotateCcw, Shield, Trash2, Users, Wallet, Wrench, Zap } from 'lucide-react';
import { api } from '@/lib/api-client';
import { CreditRequests } from './credit-requests';
import { AI_STUDIO_TOOLS } from '@/lib/ai-studio-tools';
import { useAppStore } from '@/lib/store';
import { useSession } from '@/hooks/use-session';
import { H3Tests } from './h3-tests';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/layout/icon';
import { EmptyState } from '@/components/shared/empty-state';
import { ModuleStatusBadge } from '@/components/shared/module-badge';
import { ViewHeader } from '@/components/shared/view-header';
import type {
  AdminUserDTO,
  BriefDTO,
  Locale,
  ModuleDTO,
  ModerationItemDTO,
  SmokeTestDTO,
  VideoEngineConfig,
  VideoEngineId,
  VideoModel,
} from '@/lib/types';

// ─── overview response ──────────────────────────────────────────────────────

interface AdminOverview {
  reported: ModerationItemDTO[];
  pendingSmokeTests: SmokeTestDTO[];
  pendingBriefs: BriefDTO[];
  users: AdminUserDTO[];
}

interface AdminFinance {
  members: number;
  outstandingCredits: number;
  jobs: number;
  chargedCredits: number;
  estimatedCostKrw: number;
  estimatedMarginKrw: number;
  monthlyNetCreditFlow: number;
  engines: { providerId: string; label: string; category: string; total: number; completed: number; failed: number; credits: number; estimatedCostKrw: number }[];
}

// ─── formatting helpers ─────────────────────────────────────────────────────

const won = (n: number, locale: Locale) =>
  `₩${n.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR')}`;

const fmtDate = (iso: string, locale: Locale) =>
  new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const xs = 'h-7 px-2 text-xs' as const;

// ─── view root ──────────────────────────────────────────────────────────────

export default function AdminView() {
  const t = useTranslations('admin');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const session = useSession();

  const overviewQ = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get<AdminOverview>('/api/admin/overview'),
    enabled: !!session && session.role === 'admin',
  });

  // admin guard
  if (!session || session.role !== 'admin') {
    return (
      <EmptyState
        icon={<Shield className="size-5" />}
        title={t('forbidden')}
        action={
          session ? (
            <Button variant="outline" onClick={() => navigate('home')}>
              {t('goHome')}
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (!requireLogin()) return;
              }}
            >
              {tc('login')}
            </Button>
          )
        }
      />
    );
  }

  const reported = overviewQ.data?.reported ?? [];
  const pendingSmokeTests = overviewQ.data?.pendingSmokeTests ?? [];
  const pendingBriefs = overviewQ.data?.pendingBriefs ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-5xl"
    >
      <ViewHeader title={t('title')} subtitle={t('subtitle')} />

      {overviewQ.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-96 rounded-md" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : overviewQ.isError ? (
        <EmptyState
          icon={<Shield className="size-5" />}
          title={t('loadFailed')}
          action={
            <Button variant="outline" onClick={() => void overviewQ.refetch()}>
              {tc('retry')}
            </Button>
          }
        />
      ) : (
        <Tabs defaultValue="dashboard">
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard"><BarChart3 className="mr-1 size-3.5" />운영 대시보드</TabsTrigger>
            <TabsTrigger value="modules">{t('tabModules')}</TabsTrigger>
            <TabsTrigger value="moderation">
              {t('tabModeration')}
              {reported.length > 0 && <Badge className="ml-1.5 px-1.5">{reported.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="smoke">
              {t('tabSmoke')}
              {pendingSmokeTests.length > 0 && (
                <Badge className="ml-1.5 px-1.5">{pendingSmokeTests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="briefs">
              {t('tabBriefs')}
              {pendingBriefs.length > 0 && (
                <Badge className="ml-1.5 px-1.5">{pendingBriefs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quick-tools">
              <Wrench className="mr-1 size-3.5" />
              {t('tabQuickTools')}
            </TabsTrigger>
            <TabsTrigger value="video-engine">
              <Film className="mr-1 size-3.5" />
              {t('tabVideoEngine')}
            </TabsTrigger>
            <TabsTrigger value="users">{t('tabUsers')}</TabsTrigger>
            <TabsTrigger value="logs">{t('tabLogs')}</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <CreditRequests />
            <DashboardTab />
          </TabsContent>

          <TabsContent value="modules" className="mt-4">
            <ModulesTab />
          </TabsContent>
          <TabsContent value="quick-tools" className="mt-4">
            <QuickToolsTab />
          </TabsContent>
          <TabsContent value="video-engine" className="mt-4">
            <H3Tests />
            <VideoEngineTab />
          </TabsContent>
          <TabsContent value="moderation" className="mt-4">
            <ModerationTab items={reported} />
          </TabsContent>
          <TabsContent value="smoke" className="mt-4">
            <SmokeApprovalsTab items={pendingSmokeTests} users={overviewQ.data?.users ?? []} />
          </TabsContent>
          <TabsContent value="briefs" className="mt-4">
            <BriefApprovalsTab items={pendingBriefs} />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UsersTab users={overviewQ.data?.users ?? []} />
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <ApiLogsTab />
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  );
}

function DashboardTab() {
  const financeQ = useQuery({ queryKey: ['admin', 'finance'], queryFn: () => api.get<AdminFinance>('/api/admin/finance') });
  if (financeQ.isLoading) return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}</div>;
  if (financeQ.isError || !financeQ.data) return <EmptyState icon={<BarChart3 className="size-5" />} title="운영 지표를 불러오지 못했습니다" action={<Button variant="outline" onClick={() => void financeQ.refetch()}>다시 시도</Button>} />;
  const data = financeQ.data;
  const cards = [
    { label: '전체 회원', value: data.members.toLocaleString(), icon: <Users className="size-4" /> },
    { label: '보유 크레딧 부채', value: `${data.outstandingCredits.toLocaleString()} 크`, icon: <Coins className="size-4" /> },
    { label: 'AI 실행 건수', value: data.jobs.toLocaleString(), icon: <ReceiptText className="size-4" /> },
    { label: '추정 운영 마진', value: `₩${Math.round(data.estimatedMarginKrw).toLocaleString()}`, icon: <Wallet className="size-4" /> },
  ];
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map((card) => <Card key={card.label} className="gap-2 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{card.icon}{card.label}</div><p className="text-xl font-bold tabular-nums">{card.value}</p></Card>)}</div>
    <Card className="p-4"><div className="flex flex-wrap gap-x-8 gap-y-2 text-sm"><span>누적 차감 <strong className="ml-1 tabular-nums">{data.chargedCredits.toLocaleString()} 크</strong></span><span>추정 GPU 원가 <strong className="ml-1 tabular-nums">₩{Math.round(data.estimatedCostKrw).toLocaleString()}</strong></span><span>이번 달 순 크레딧 흐름 <strong className="ml-1 tabular-nums">{data.monthlyNetCreditFlow > 0 ? '+' : ''}{data.monthlyNetCreditFlow.toLocaleString()} 크</strong></span></div></Card>
    <div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>엔진 / 도구</TableHead><TableHead>유형</TableHead><TableHead className="text-right">실행</TableHead><TableHead className="text-right">성공률</TableHead><TableHead className="text-right">차감</TableHead><TableHead className="text-right">추정 원가</TableHead></TableRow></TableHeader><TableBody>{data.engines.length ? data.engines.map((engine) => <TableRow key={engine.providerId}><TableCell className="font-medium">{engine.label}</TableCell><TableCell><Badge variant="secondary">{engine.category}</Badge></TableCell><TableCell className="text-right tabular-nums">{engine.total}</TableCell><TableCell className="text-right tabular-nums">{engine.total ? `${Math.round((engine.completed / engine.total) * 100)}%` : '—'}</TableCell><TableCell className="text-right tabular-nums">{engine.credits.toLocaleString()} 크</TableCell><TableCell className="text-right tabular-nums">₩{Math.round(engine.estimatedCostKrw).toLocaleString()}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">아직 집계된 AI 실행이 없습니다.</TableCell></TableRow>}</TableBody></Table></div>
  </div>;
}

// ─── module switches ────────────────────────────────────────────────────────

function ModulesTab() {
  const t = useTranslations('admin');
  const locale = useAppStore((s) => s.locale);
  const qc = useQueryClient();
  const { toast } = useToast();

  const modulesQ = useQuery({
    queryKey: ['modules', 'all'],
    queryFn: () => api.get<ModuleDTO[]>('/api/modules'),
  });

  const patchM = useMutation({
    mutationFn: (body: { id: string; enabled?: boolean; status?: ModuleDTO['status'] }) =>
      api.patch<ModuleDTO>('/api/admin/modules', body),
    onSuccess: (_data, variables) => {
      if (typeof variables.enabled === 'boolean') {
        toast({ title: variables.enabled ? t('moduleOnToast') : t('moduleOffToast') });
      } else {
        toast({ title: t('moduleStatusToast') });
      }
      void qc.invalidateQueries({ queryKey: ['modules', 'all'] });
      void qc.invalidateQueries({ queryKey: ['modules'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const modules = [...(modulesQ.data ?? [])].sort((a, b) => a.navOrder - b.navOrder);

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="size-3.5 shrink-0" />
        {t('darkLaunchHint')}
      </p>

      {modulesQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Card key={m.id} className="gap-3 p-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name={m.icon} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{locale === 'ko' ? m.titleKo : m.titleEn}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{m.entryView}</p>
                </div>
                <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">P{m.phase}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={m.status}
                  onValueChange={(v) => patchM.mutate({ id: m.id, status: v as ModuleDTO['status'] })}
                >
                  <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('modActive')}</SelectItem>
                    <SelectItem value="new">{t('modNew')}</SelectItem>
                    <SelectItem value="beta">{t('modBeta')}</SelectItem>
                    <SelectItem value="coming-soon">{t('modComingSoon')}</SelectItem>
                    <SelectItem value="preparing">{t('modPreparing') ?? '준비 중'}</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    checked={m.enabled}
                    onCheckedChange={(enabled) => patchM.mutate({ id: m.id, enabled })}
                    disabled={patchM.isPending}
                    aria-label={`${m.titleKo} ${m.enabled ? '숨기기' : '노출하기'}`}
                  />
                  <span>{m.enabled ? '노출' : '숨김'}</span>
                </label>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── content moderation ─────────────────────────────────────────────────────

function ModerationTab({ items }: { items: ModerationItemDTO[] }) {
  const t = useTranslations('admin');
  const tc = useTranslations('core');
  const qc = useQueryClient();
  const { toast } = useToast();

  const moderateM = useMutation({
    mutationFn: (body: { targetType: string; targetId: string; action: 'hide' | 'dismiss' | 'restore' }) =>
      api.post<null>('/api/admin/moderate', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  if (items.length === 0) {
    return <EmptyState icon={<CheckCircle className="size-5" />} title={t('moderationEmpty')} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={`${item.targetType}-${item.targetId}`} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {item.targetType === 'prompt' ? t('targetTypePrompt') : t('targetTypeArtifact')}
            </Badge>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</p>
            {item.status === 'hidden' && (
              <Badge variant="outline" className="border-red-500/40 text-red-500">
                {t('hiddenBadge')}
              </Badge>
            )}
            <Badge variant="destructive">{t('reportCount', { n: item.reportCount })}</Badge>
          </div>
          {item.body && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.body}</p>}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">@{item.ownerUsername}</span>
            <div className="ml-auto flex items-center gap-1.5">
              {item.status === 'hidden' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className={xs}
                  disabled={moderateM.isPending}
                  onClick={() =>
                    moderateM.mutate({ targetType: item.targetType, targetId: item.targetId, action: 'restore' })
                  }
                >
                  {t('restore')}
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    className={xs}
                    disabled={moderateM.isPending}
                    onClick={() =>
                      moderateM.mutate({ targetType: item.targetType, targetId: item.targetId, action: 'hide' })
                    }
                  >
                    {t('hide')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={xs}
                    disabled={moderateM.isPending}
                    onClick={() =>
                      moderateM.mutate({ targetType: item.targetType, targetId: item.targetId, action: 'dismiss' })
                    }
                  >
                    {t('dismiss')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
      {moderateM.isPending && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          {tc('loading')}
        </p>
      )}
    </div>
  );
}

// ─── smoke test approvals ───────────────────────────────────────────────────

function SmokeApprovalsTab({ items, users }: { items: SmokeTestDTO[]; users: AdminUserDTO[] }) {
  const t = useTranslations('admin');
  const locale = useAppStore((s) => s.locale);
  const qc = useQueryClient();
  const { toast } = useToast();

  const approveM = useMutation({
    mutationFn: (id: string) => api.post<SmokeTestDTO>(`/api/admin/smoke-tests/${id}/approve`),
    onSuccess: () => {
      toast({ title: t('smokeToast') });
      void qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  if (items.length === 0) {
    return <EmptyState icon={<Radar className="size-5" />} title={t('smokeEmpty')} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t('smokeHint')}</p>
      {items.map((st) => {
        const requester = users.find((u) => u.id === st.requestedById)?.username;
        return (
          <Card key={st.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{st.artifact?.title ?? '—'}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {requester ? `@${requester}` : st.requestedById.slice(0, 10)} ·{' '}
                {won(st.budget, locale)} · {fmtDate(st.requestedAt, locale)}
              </p>
            </div>
            <Button
              size="sm"
              className={xs}
              disabled={approveM.isPending}
              onClick={() => approveM.mutate(st.id)}
            >
              {approveM.isPending && <Loader2 className="size-3 animate-spin" />}
              {t('smokeApprove')}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

// ─── brief approvals ────────────────────────────────────────────────────────

function BriefApprovalsTab({ items }: { items: BriefDTO[] }) {
  const t = useTranslations('admin');
  const locale = useAppStore((s) => s.locale);
  const qc = useQueryClient();
  const { toast } = useToast();

  const decideM = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      api.post<BriefDTO>(`/api/admin/briefs/${id}/${action}`),
    onSuccess: (_data, variables) => {
      toast({ title: variables.action === 'approve' ? t('briefApproveToast') : t('briefRejectToast') });
      void qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  if (items.length === 0) {
    return <EmptyState icon={<CheckCircle className="size-5" />} title={t('briefsEmpty')} />;
  }

  return (
    <div className="space-y-3">
      {items.map((brief) => {
        const budget = brief.budget ?? brief.structuredSpec.suggestedBudgetKrw;
        return (
          <Card key={brief.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{brief.title}</p>
              <Button
                size="sm"
                className={xs}
                disabled={decideM.isPending}
                onClick={() => decideM.mutate({ id: brief.id, action: 'approve' })}
              >
                {t('briefApprove')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className={xs}
                disabled={decideM.isPending}
                onClick={() => decideM.mutate({ id: brief.id, action: 'reject' })}
              >
                {t('briefReject')}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              @{brief.author.username} · {won(budget, locale)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brief.structuredSpec.features.slice(0, 3).map((f, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {f}
                </Badge>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── users ──────────────────────────────────────────────────────────────────

function UsersTab({ users }: { users: AdminUserDTO[] }) {
  const t = useTranslations('admin');
  const locale = useAppStore((s) => s.locale);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});

  const patchM = useMutation({
    mutationFn: (body: { id: string; role?: 'user' | 'admin'; banned?: boolean }) =>
      api.patch<AdminUserDTO>('/api/admin/users', body),
    onSuccess: (_data, variables) => {
      if (typeof variables.banned === 'boolean') {
        toast({ title: variables.banned ? t('bannedOnToast') : t('bannedOffToast') });
      } else {
        toast({ title: t('roleToast') });
      }
      void qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const creditM = useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) => api.post<{ balance: number }>('/api/admin/finance', { userId, amount, memo: '관리자 수동 조정' }),
    onSuccess: (data, variables) => {
      toast({ title: `크레딧 조정 완료 · 잔액 ${data.balance.toLocaleString()}크` });
      setAdjustments((current) => ({ ...current, [variables.userId]: '' }));
      void qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] });
    },
    onError: (error: Error) => toast({ title: error.message, variant: 'destructive' }),
  });

  return (
    <div className="max-h-96 overflow-y-auto rounded-md border scrollbar-thin">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('thUser')}</TableHead>
            <TableHead>{t('thJoined')}</TableHead>
            <TableHead>{t('thWorks')}</TableHead>
            <TableHead className="text-right">{t('thCredits')}</TableHead>
            <TableHead>{t('thRole')}</TableHead>
            <TableHead>{t('thBanned')}</TableHead>
            <TableHead>크레딧 조정</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} className={u.banned ? 'bg-red-500/5' : undefined}>
              <TableCell className="whitespace-nowrap font-medium">
                @{u.username}
                {u.role === 'admin' && (
                  <Badge variant="outline" className="ml-2 border-primary/40 text-primary">
                    admin
                  </Badge>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap">{fmtDate(u.createdAt, locale)}</TableCell>
              <TableCell className="tabular-nums">
                {u.promptCount.toLocaleString()} / {u.artifactCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {u.credits.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR')}
              </TableCell>
              <TableCell>
                <Select
                  value={u.role}
                  onValueChange={(v) => patchM.mutate({ id: u.id, role: v as 'user' | 'admin' })}
                >
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">user</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex min-w-44 gap-1.5">
                  <Button size="sm" className="h-8 px-2 text-xs" disabled={creditM.isPending} onClick={() => creditM.mutate({ userId: u.id, amount: 500 })}>+500 지급</Button>
                  <Input
                    aria-label={`${u.username} 크레딧 조정`}
                    className="h-8 w-24 text-xs"
                    placeholder="회수: 음수"
                    inputMode="numeric"
                    value={adjustments[u.id] ?? ''}
                    onChange={(event) => setAdjustments((current) => ({ ...current, [u.id]: event.target.value }))}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={creditM.isPending || !Number.isFinite(Number(adjustments[u.id])) || Number(adjustments[u.id]) === 0}
                    onClick={() => creditM.mutate({ userId: u.id, amount: Number(adjustments[u.id]) })}
                  >적용</Button>
                </div>
              </TableCell>
              <TableCell>
                <Switch
                  checked={u.banned}
                  disabled={patchM.isPending}
                  onCheckedChange={(banned) => patchM.mutate({ id: u.id, banned })}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── quick start tools config ──────────────────────────────────────────────

interface QuickToolConfig {
  id: string;
  enabled: boolean;
  order: number;
}

function QuickToolsTab() {
  const t = useTranslations('admin');
  const locale = useAppStore((s) => s.locale);
  const { toast } = useToast();
  const qc = useQueryClient();

  const configQ = useQuery({
    queryKey: ['admin', 'quick-tools'],
    queryFn: () => api.get<QuickToolConfig[]>('/api/admin/quick-tools').catch(() => [] as QuickToolConfig[]),
  });

  // Build merged list: saved config + any new tools not yet in config
  const savedConfig = configQ.data ?? [];
  const allTools = AI_STUDIO_TOOLS.map((tool, defaultIdx) => {
    const saved = savedConfig.find((c) => c.id === tool.id);
    return {
      ...tool,
      enabled: saved ? saved.enabled : true,
      order: saved ? saved.order : defaultIdx,
    };
  }).sort((a, b) => a.order - b.order);

  const [items, setItems] = useState(allTools);
  const [dirty, setDirty] = useState(false);

  const configKey = JSON.stringify(allTools.map((t) => ({ id: t.id, enabled: t.enabled, order: t.order })));
  useEffect(() => {
    if (!dirty) setItems(allTools);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item));
    setDirty(true);
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((item, i) => ({ ...item, order: i }));
    });
    setDirty(true);
  };

  const saveM = useMutation({
    mutationFn: (configs: QuickToolConfig[]) =>
      api.put<QuickToolConfig[]>('/api/admin/quick-tools', configs),
    onSuccess: () => {
      toast({ title: t('qtSaveToast') });
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ['admin', 'quick-tools'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const handleSave = () => {
    const configs: QuickToolConfig[] = items.map((item, i) => ({
      id: item.id,
      enabled: item.enabled,
      order: i,
    }));
    saveM.mutate(configs);
  };

  const handleReset = () => {
    const resetItems = AI_STUDIO_TOOLS.map((tool, i) => ({
      ...tool,
      enabled: true,
      order: i,
    }));
    setItems(resetItems);
    const configs: QuickToolConfig[] = [];
    saveM.mutate(configs);
    toast({ title: t('qtResetToast') });
  };

  const activeCount = items.filter((i) => i.enabled).length;

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Wrench className="size-3.5 shrink-0" />
        {t('qtHint')}
      </p>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-xs">
          {t('qtActiveCount')}: {activeCount}/{items.length}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleReset} disabled={saveM.isPending}>
            <RotateCcw className="mr-1 size-3" />
            {t('qtReset')}
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!dirty || saveM.isPending}>
            {saveM.isPending && <Loader2 className="mr-1 size-3 animate-spin" />}
            {t('qtSave')}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <Card key={item.id} className={`flex-row items-center gap-3 p-3 transition-all ${item.enabled ? '' : 'opacity-50'}`}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name={item.icon} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.titleKo}</p>
              <p className="truncate text-[11px] text-muted-foreground">{item.descKo}</p>
            </div>
            <Badge variant={item.enabled ? 'default' : 'secondary'} className="shrink-0 px-1.5 py-0 text-[10px]">
              {item.enabled ? t('qtEnabled') : t('qtHidden')}
            </Badge>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0"
                disabled={idx === 0}
                onClick={() => moveItem(item.id, 'up')}
                aria-label={t('qtMoveUp')}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0"
                disabled={idx === items.length - 1}
                onClick={() => moveItem(item.id, 'down')}
                aria-label={t('qtMoveDown')}
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
            <Switch
              checked={item.enabled}
              onCheckedChange={() => toggleItem(item.id)}
              aria-label={`${item.titleKo} ${item.enabled ? '숨기기' : '노출하기'}`}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── video engine config ───────────────────────────────────────────────────

const VIDEO_ENGINES: VideoEngineConfig[] = [
  {
    engineId: 'h3',
    label: 'MiniMax H3',
    description: 'Omni-modal video model — FL2VA + Ref2VA (Aug 2026)',
    enabled: true,
    adminOnly: false,
    defaultModel: 'h3',
    models: [
      {
        id: 'h3',
        label: 'H3 Unified',
        version: '1.0 (Aug 2026)',
        params: '~30B',
        license: 'MiniMax H3 Community License (승인 완료)',
        runpodType: 'self-hosted',
        minGpu: 'RTX 5090 / 80GB+ VRAM',
        features: ['Text→Video', 'Image→Video', 'Ref-guided', 'Audio+Video single pass', 'Character consistency'],
      },
      {
        id: 'h3-fl2va',
        label: 'H3 FL2VA',
        version: '1.0',
        params: '~30B',
        license: 'MiniMax H3 Community License (승인 완료)',
        runpodType: 'self-hosted',
        minGpu: 'RTX 5090 / 80GB+ VRAM',
        features: ['Text→Video', 'Image→Video'],
      },
      {
        id: 'h3-ref2va',
        label: 'H3 Ref2VA',
        version: '1.0',
        params: '~30B',
        license: 'MiniMax H3 Community License (승인 완료)',
        runpodType: 'self-hosted',
        minGpu: 'RTX 5090 / 80GB+ VRAM',
        features: ['Reference-guided video', 'Character consistency'],
      },
    ],
    storageCostMonthly: '~$2.10/mo (30GB weights)',
    status: 'ready',
  },
  {
    engineId: 'wan',
    label: 'Wan (Alibaba)',
    description: 'Wan 2.6 managed + Wan 2.5/2.2 self-hosted',
    enabled: true,
    adminOnly: false,
    defaultModel: 'wan26',
    models: [
      {
        id: 'wan26',
        label: 'Wan 2.6',
        version: '2.6 (2026)',
        params: '14B',
        license: 'Apache 2.0 (API managed by RunPod)',
        runpodType: 'managed',
        minGpu: 'N/A (managed)',
        features: ['Ref→Video identity consistency', 'Text→Video', 'Image→Video', 'Multi-scene storytelling'],
      },
      {
        id: 'wan25',
        label: 'Wan 2.5',
        version: '2.5 (2026)',
        params: '14B',
        license: 'Apache 2.0',
        runpodType: 'self-hosted',
        minGpu: 'H100 / RTX 5090',
        features: ['Audio+Video single pass', 'Voice + ambient + BGM aligned'],
      },
      {
        id: 'wan22',
        label: 'Wan 2.2',
        version: '2.2 (2025)',
        params: '14B',
        license: 'Apache 2.0',
        runpodType: 'self-hosted',
        minGpu: 'A100 / RTX 4090+',
        features: ['Text→Video', 'Image→Video', 'Stable fallback'],
      },
    ],
    storageCostMonthly: '~$1.00/mo (14GB weights)',
    status: 'ready',
  },
  {
    engineId: 'ltx',
    label: 'LTX (Lightricks)',
    description: 'LTX-2.5 world model — multishot + audio (Aug 2026)',
    enabled: true,
    adminOnly: false,
    defaultModel: 'ltx25',
    models: [
      {
        id: 'ltx25',
        label: 'LTX-2.5',
        version: '2.5 (Aug 2026)',
        params: '22B',
        license: 'Open weights (license TBD)',
        runpodType: 'self-hosted',
        minGpu: 'H100 / RTX 5090',
        features: ['Native multishot', 'Audio+Video', 'Diffusion Fidelity Rendering', 'World model'],
      },
      {
        id: 'ltx23',
        label: 'LTX-2.3',
        version: '2.3 (2026)',
        params: '13B',
        license: 'Open weights',
        runpodType: 'self-hosted',
        minGpu: 'A100 / RTX 4090+',
        features: ['Text→Video', 'Image→Video', 'Fast inference'],
      },
      {
        id: 'ltx2',
        label: 'LTX-2.0',
        version: '2.0 (2025)',
        params: '8B',
        license: 'Open weights',
        runpodType: 'self-hosted',
        minGpu: 'RTX 4090',
        features: ['Text→Video', 'Fastest generation'],
      },
    ],
    storageCostMonthly: '~$1.50/mo (22GB weights)',
    status: 'ready',
  },
];

// The API persists only the operational settings (enabled, default model,
// endpoint and status). Presentation metadata and the model catalogue live in
// this view, so never render the persisted record directly as a full engine.
// Doing so made `engine.models` undefined and crashed the entire admin page.
type VideoEngineRuntimeConfig = Pick<
  VideoEngineConfig,
  'engineId' | 'enabled' | 'adminOnly' | 'defaultModel' | 'runpodEndpointId' | 'status'
>;

function hydrateVideoEngines(remote?: VideoEngineRuntimeConfig[]): VideoEngineConfig[] {
  const runtimeById = new Map(remote?.map((engine) => [engine.engineId, engine]));

  return VIDEO_ENGINES.map((engine) => {
    const runtime = runtimeById.get(engine.engineId);
    if (!runtime) return engine;

    // A stale database setting must not leave the select with an invalid value.
    const defaultModel = engine.models.some((model) => model.id === runtime.defaultModel)
      ? runtime.defaultModel
      : engine.defaultModel;

    return { ...engine, ...runtime, defaultModel, models: engine.models };
  });
}

const engineStatusBadge = (status: VideoEngineConfig['status'], t: (k: string) => string) => {
  switch (status) {
    case 'ready':
      return <Badge className="border-green-500/40 bg-green-500/10 text-green-600"><Circle className="mr-1 size-2 fill-green-500" />{t('veStatusReady')}</Badge>;
    case 'provisioning':
      return <Badge className="border-blue-500/40 bg-blue-500/10 text-blue-600"><Loader2 className="mr-1 size-2 animate-spin" />{t('veStatusProvisioning')}</Badge>;
    case 'error':
      return <Badge className="border-red-500/40 bg-red-500/10 text-red-600"><AlertTriangle className="mr-1 size-2" />{t('veStatusError')}</Badge>;
    default:
      return <Badge variant="outline"><Circle className="mr-1 size-2 fill-muted-foreground" />{t('veStatusOffline')}</Badge>;
  }
};

function VideoEngineTab() {
  const t = useTranslations('admin');
  const locale = useAppStore((s) => s.locale);
  const { toast } = useToast();
  const qc = useQueryClient();

  const engineQ = useQuery({
    queryKey: ['admin', 'video-engines'],
    queryFn: () => api.get<VideoEngineRuntimeConfig[]>('/api/admin/video-engine').catch(() => []),
    placeholderData: VIDEO_ENGINES,
  });

  const patchM = useMutation({
    mutationFn: (body: { engineId: VideoEngineId; enabled?: boolean; adminOnly?: boolean; defaultModel?: VideoModel }) =>
      api.patch<VideoEngineConfig>('/api/admin/video-engine', body).catch(() => {
        const e = VIDEO_ENGINES.find((x) => x.engineId === body.engineId)!;
        return { ...e, ...body } as VideoEngineConfig;
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'video-engines'] });
      if (typeof variables.enabled === 'boolean') {
        toast({ title: variables.enabled ? t('veToggleOnToast') : t('veToggleOffToast') });
      } else if (typeof variables.adminOnly === 'boolean') {
        toast({ title: variables.adminOnly ? t('veAdminOnlyOnToast') : t('veAdminOnlyOffToast') });
      } else if (variables.defaultModel) {
        toast({ title: t('veDefaultToast') });
      }
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const engines = hydrateVideoEngines(engineQ.data);
  const activeCount = engines.filter((e) => e.enabled).length;

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Zap className="size-3.5 shrink-0" />
        {t('veHint')}
      </p>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {t('veActiveEngine')}: {activeCount}/3
        </Badge>
        {activeCount === 0 && (
          <span className="text-xs text-muted-foreground">{t('veNoEngine')}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {engines.map((engine) => (
          <Card key={engine.engineId} className={`gap-0 overflow-hidden p-0 shadow-sm transition-all ${engine.enabled ? 'ring-2 ring-primary/30' : ''}`}>
            {/* Header */}
            <div className="flex items-center gap-3 border-b p-4">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${engine.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Film className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{engine.label}</p>
                <p className="text-[11px] text-muted-foreground">{engine.description}</p>
              </div>
              <Switch
                checked={engine.enabled}
                onCheckedChange={(enabled) => patchM.mutate({ engineId: engine.engineId, enabled })}
                disabled={patchM.isPending}
                aria-label={`${engine.label} toggle`}
              />
            </div>

            {/* Status + cost */}
            <div className="flex items-center justify-between border-b px-4 py-2">
              {engineStatusBadge(engine.status, t)}
              <span className="text-[11px] text-muted-foreground">{t('veStorage')}: {engine.storageCostMonthly}</span>
            </div>

            {/* Admin only toggle */}
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Shield className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">{t('veAdminOnly')}</span>
              </div>
              <div className="flex items-center gap-2">
                {engine.adminOnly && (
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-600">
                    Admin Only
                  </Badge>
                )}
                <Switch
                  checked={engine.adminOnly}
                  onCheckedChange={(adminOnly) => patchM.mutate({ engineId: engine.engineId, adminOnly })}
                  disabled={patchM.isPending}
                  aria-label={`${engine.label} admin only`}
                />
              </div>
            </div>

            {/* Default model selector */}
            <div className="border-b px-4 py-3">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('veDefault')}</label>
              <Select
                value={engine.defaultModel}
                onValueChange={(v) => patchM.mutate({ engineId: engine.engineId, defaultModel: v as VideoModel })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(engine.models ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label} ({m.version})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Models list */}
            <div className="space-y-0 divide-y px-0">
              {(engine.models ?? []).map((m) => (
                <div key={m.id} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold">{m.label}</p>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{m.version}</Badge>
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      {m.runpodType === 'self-hosted' ? t('veRunpodSelfHosted') : m.runpodType === 'managed' ? t('veRunpodManaged') : t('veRunpodApiOnly')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 text-[11px] text-muted-foreground">
                    <span>{t('veParams')}: {m.params}</span>
                    <span>{t('veGpu')}: {m.minGpu}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{t('veLicense')}: {m.license}</p>
                  <div className="flex flex-wrap gap-1">
                    {m.features.map((f) => (
                      <Badge key={f} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">{f}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── API logs ──────────────────────────────────────────────────────────────

interface LogJob {
  id: string;
  username: string;
  provider: string;
  adapterType: string;
  promptText: string;
  aspect: string;
  status: string;
  creditCharged: number;
  costActual: number;
  category: string;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

interface LogSummary { status: string; count: number; totalCredits: number; totalCost: number; }
interface LogsResponse { jobs: LogJob[]; total: number; page: number; limit: number; summary: LogSummary[]; }

const statusIcon = (s: string) => {
  switch (s) {
    case 'done': return <CheckCircle className="size-4 text-green-500" />;
    case 'failed': return <AlertTriangle className="size-4 text-red-500" />;
    case 'running': return <Loader2 className="size-4 animate-spin text-blue-500" />;
    default: return <Clock className="size-4 text-muted-foreground" />;
  }
};

function ApiLogsTab() {
  const t = useTranslations('admin');
  const locale = useAppStore((s) => s.locale);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const logsQ = useQuery({
    queryKey: ['admin', 'logs', page, statusFilter, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      return api.get<LogsResponse>(`/api/admin/logs?${params}`);
    },
  });

  const cleanupM = useMutation({
    mutationFn: () => api.post<{ cleaned: number; refunded: number }>('/api/admin/logs', { action: 'cleanup-stuck' }),
    onSuccess: (data) => {
      toast({ title: `${data.cleaned}건 정리 완료 (${data.refunded}크레딧 환불)` });
      void qc.invalidateQueries({ queryKey: ['admin', 'logs'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const jobs = logsQ.data?.jobs ?? [];
  const total = logsQ.data?.total ?? 0;
  const summary = logsQ.data?.summary ?? [];
  const totalPages = Math.ceil(total / 50);
  const stuckCount = summary.filter((s) => s.status === 'queued' || s.status === 'running').reduce((a, s) => a + s.count, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        {summary.map((s) => (
          <Card key={s.status} className="flex items-center gap-2 px-4 py-2">
            {statusIcon(s.status)}
            <span className="text-sm font-medium capitalize">{s.status}</span>
            <Badge variant="secondary">{s.count}</Badge>
            <span className="text-xs text-muted-foreground">{s.totalCredits.toLocaleString()}크 · ₩{Math.round(s.totalCost).toLocaleString()}</span>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('logsAll')}</SelectItem>
            <SelectItem value="done">done</SelectItem>
            <SelectItem value="failed">failed</SelectItem>
            <SelectItem value="running">running</SelectItem>
            <SelectItem value="queued">queued</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 도구</SelectItem>
            <SelectItem value="image">이미지</SelectItem>
            <SelectItem value="video">영상</SelectItem>
            <SelectItem value="3d">3D</SelectItem>
          </SelectContent>
        </Select>

        {stuckCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs"
            disabled={cleanupM.isPending}
            onClick={() => cleanupM.mutate()}
          >
            {cleanupM.isPending ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            &nbsp;멈춘 job {stuckCount}건 정리 + 환불
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8 text-xs"
          onClick={() => void qc.invalidateQueries({ queryKey: ['admin', 'logs'] })}
        >
          <RotateCcw className="size-3" /> 새로고침
        </Button>
      </div>

      {/* Table */}
      {logsQ.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-md" />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>유저</TableHead>
                <TableHead>모델</TableHead>
                <TableHead>도구</TableHead>
                <TableHead>프롬프트</TableHead>
                <TableHead className="text-right">크레딧</TableHead>
                <TableHead className="text-right">추정 원가</TableHead>
                <TableHead>소요</TableHead>
                <TableHead>에러</TableHead>
                <TableHead>시간</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => (
                <TableRow key={j.id} className={j.status === 'failed' ? 'bg-red-500/5' : j.status === 'running' ? 'bg-blue-500/5' : undefined}>
                  <TableCell>{statusIcon(j.status)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">@{j.username}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-xs font-medium">{j.provider}</span>
                    <span className="ml-1 text-[10px] text-muted-foreground">{j.adapterType}</span>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{j.category}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={j.promptText}>
                    {j.promptText}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{j.creditCharged}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">₩{Math.round(j.costActual).toLocaleString()}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {j.durationMs != null ? `${(j.durationMs / 1000).toFixed(1)}s` : '—'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-red-500" title={j.error ?? ''}>
                    {j.error ?? ''}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {fmtDate(j.createdAt, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</Button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" className="h-7" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>→</Button>
        </div>
      )}
    </div>
  );
}
