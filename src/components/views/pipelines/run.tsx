'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft, Check, Loader2, Wand2, Zap } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useRefreshSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import type { ArtifactDTO, PipelineDTO, RunDTO } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/layout/icon';
import { EmptyState } from '@/components/shared/empty-state';
import { PreviewRenderer } from '@/components/shared/preview-renderer';
import { StepForm } from '@/components/shared/step-form';

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return String(e);
}

/** Pipeline run view — register in ViewRouter as: import { PipelineRunView } from '@/components/views/pipelines/run' */
export function PipelineRunView() {
  const t = useTranslations('pipelines');
  const tc = useTranslations('core');
  const id = useAppStore((s) => s.params.id ?? '');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);

  const pipelinesQ = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.get<PipelineDTO[]>('/api/pipelines'),
  });

  const p = (pipelinesQ.data ?? []).find((x) => x.id === id);

  if (pipelinesQ.isLoading) {
    return (
      <div className="min-w-0 max-w-3xl space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }
  if (pipelinesQ.isError) {
    return (
      <EmptyState
        title={tc('error')}
        description={errMsg(pipelinesQ.error)}
        action={
          <Button variant="outline" size="sm" onClick={() => void pipelinesQ.refetch()}>
            {tc('retry')}
          </Button>
        }
      />
    );
  }
  if (!p) {
    return <EmptyState title={t('notFound')} description={t('notFoundDesc')} />;
  }

  const name = locale === 'ko' ? p.displayNameKo : p.displayNameEn;
  const desc = locale === 'ko' ? p.descKo : p.descEn;

  return (
    <div className="min-w-0 max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-7 text-muted-foreground"
        onClick={() => navigate('pipelines')}
      >
        <ArrowLeft className="size-4" /> {t('back')}
      </Button>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
          <Icon name={p.icon} className="h-6 w-6 text-primary" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <Badge variant="outline">
              <Zap /> {t('creditsBadge', { n: p.creditCost })}
            </Badge>
          </div>
          {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
        </div>
      </div>

      {/* keyed by pipeline id → fresh form/run state per pipeline */}
      <div className="mt-6">
        <RunInner key={p.id} pipeline={p} />
      </div>
    </div>
  );
}

// ─── inner (per-pipeline state) ─────────────────────────────────────────────

function RunInner({ pipeline }: { pipeline: PipelineDTO }) {
  const t = useTranslations('pipelines');
  const tc = useTranslations('core');
  const navigate = useAppStore((s) => s.navigate);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const refreshSession = useRefreshSession();
  const { toast } = useToast();
  const qc = useQueryClient();

  const pid = pipeline.id;
  const locale = useAppStore((s) => s.locale);
  const [values, setValues] = useState<Record<string, string>>(() => defaultsFor(pid));
  const [runId, setRunId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publishedFor, setPublishedFor] = useState<string | null>(null);

  const runQ = useQuery({
    queryKey: ['pipeline-run', runId],
    queryFn: () => api.get<RunDTO>(`/api/pipeline-runs/${runId}`),
    enabled: !!runId,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1500 : false),
  });
  const run = runQ.data;

  const toastErr = (e: unknown) => toast({ title: tc('error'), description: errMsg(e), variant: 'destructive' });

  const set = (key: string) => (v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const ready = (() => {
    switch (pid) {
      case 'pipeline-3d':
        return !!values.productName?.trim();
      case 'pipeline-shortform':
        return !!values.topic?.trim();
      case 'pipeline-detailpage':
        return !!values.productName?.trim() && !!values.price && Number(values.price) > 0 && !!values.features?.trim();
      case 'pipeline-game':
        return !!values.theme?.trim();
      case 'pipeline-copy':
        return !!values.product?.trim();
      default:
        return true;
    }
  })();

  const buildInput = (): Record<string, unknown> => {
    switch (pid) {
      case 'pipeline-3d':
        return { productName: values.productName, stylePrompt: values.stylePrompt };
      case 'pipeline-shortform':
        return { topic: values.topic, tone: values.tone, seconds: Number(values.seconds) };
      case 'pipeline-detailpage':
        return {
          productName: values.productName,
          price: Number(values.price),
          features: values.features
            .split(/\n|,/)
            .map((s) => s.trim())
            .filter(Boolean),
        };
      case 'pipeline-game':
        return { genre: values.genre, theme: values.theme, difficulty: values.difficulty };
      case 'pipeline-copy':
        return { product: values.product, audience: values.audience, tone: values.tone };
      default:
        return {};
    }
  };

  const submit = async () => {
    if (!requireLogin()) return;
    setSubmitting(true);
    try {
      const res = await api.post<RunDTO>(`/api/pipelines/${pid}/run`, { input: buildInput() });
      setRunId(res.id);
      setPublishedFor(null);
      refreshSession();
    } catch (e) {
      toastErr(e);
    } finally {
      setSubmitting(false);
    }
  };

  const publish = async (artifact: ArtifactDTO) => {
    try {
      await api.patch(`/api/artifacts/${artifact.id}`, { status: 'published' });
      setPublishedFor(artifact.id);
      toast({ title: t('publishedToast') });
      await qc.invalidateQueries({ queryKey: ['feed'] });
    } catch (e) {
      toastErr(e);
    }
  };

  const progressHint = (progress: number) =>
    progress >= 90 ? t('stepAssembly') : progress >= 60 ? t('stepAssets') : progress >= 30 ? t('stepConcept') : t('stepPrepare');

  const displayName = locale === 'ko' ? pipeline.displayNameKo : pipeline.displayNameEn;

  // ── run in progress / result ──
  if (runId) {
    if (runQ.isLoading) {
      return <Skeleton className="h-48 w-full rounded-xl" />;
    }
    if (runQ.isError || !run) {
      return (
        <EmptyState
          title={tc('error')}
          description={errMsg(runQ.error)}
          action={
            <Button variant="outline" size="sm" onClick={() => setRunId(null)}>
              {t('newRun')}
            </Button>
          }
        />
      );
    }

    if (run.status === 'running') {
      return (
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{displayName}</span>
            <Badge variant="secondary">{t('statusRunning')}</Badge>
          </div>
          <Progress value={run.progress} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" /> {t('working')}
          </div>
          <p className="text-xs text-muted-foreground">{progressHint(run.progress)}</p>
        </Card>
      );
    }

    if (run.status === 'failed') {
      return (
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="size-5" />
            <span className="font-medium">{t('runFailed')}</span>
          </div>
          {run.error && <p className="text-sm text-muted-foreground">{run.error}</p>}
          <p className="text-xs text-muted-foreground">{t('refunded')}</p>
          <Button variant="outline" size="sm" onClick={() => setRunId(null)}>
            {t('newRun')}
          </Button>
        </Card>
      );
    }

    // done
    const artifact = run.resultArtifact;
    if (!artifact) {
      return (
        <EmptyState
          title={t('runDone')}
          action={
            <Button variant="outline" size="sm" onClick={() => setRunId(null)}>
              {t('newRun')}
            </Button>
          }
        />
      );
    }
    const isLanding = artifact.type === 'landing_page';
    const previewClass = isLanding
      ? 'min-h-[400px] w-full'
      : artifact.type === 'image' || artifact.type === '3d_asset' ? 'aspect-[4/3] w-full' : 'aspect-video w-full';
    const isPublished = publishedFor === artifact.id;

    return (
      <Card className="overflow-hidden p-0 py-0">
        <PreviewRenderer artifact={artifact} expanded={isLanding} className={previewClass} />
        <div className="space-y-4 p-6">
          <div>
            <p className="text-xs text-muted-foreground">{t('resultTitle')}</p>
            <h3 className="text-lg font-semibold">{artifact.title}</h3>
            {artifact.description && (
              <p className="mt-1 text-sm text-muted-foreground">{artifact.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isPublished} onClick={() => void publish(artifact)}>
              {isPublished ? <Check /> : <Zap />} {tc('publishToGallery')}
            </Button>
            <Button variant="outline" onClick={() => navigate('project', { id: artifact.id })}>
              {t('openProject')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRunId(null);
                setPublishedFor(null);
              }}
            >
              {t('newRun')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // ── input form ──
  const steps = stepsFor(pid, t, values, set);

  return (
    <Card className="p-6">
      <StepForm
        steps={steps}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {t('neededCredits')}{' '}
              <strong className="text-primary tabular-nums">{pipeline.creditCost.toLocaleString()}</strong>
            </span>
            <Button disabled={!ready || submitting} onClick={() => void submit()}>
              {submitting ? <Loader2 className="animate-spin" /> : <Wand2 />} {t('run')}
            </Button>
          </div>
        }
      />
    </Card>
  );
}

// ─── form config per pipeline ───────────────────────────────────────────────

type TFn = ReturnType<typeof useTranslations>;
type SetField = (key: string) => (value: string) => void;

function defaultsFor(pid: string): Record<string, string> {
  switch (pid) {
    case 'pipeline-3d':
      return { productName: '', stylePrompt: '' };
    case 'pipeline-shortform':
      return { topic: '', tone: '정보형', seconds: '15' };
    case 'pipeline-detailpage':
      return { productName: '', price: '', features: '' };
    case 'pipeline-game':
      return { genre: '슈팅', theme: '', difficulty: '보통' };
    case 'pipeline-copy':
      return { product: '', audience: '', tone: '친근함' };
    default:
      return {};
  }
}

function fieldId(pid: string, key: string) {
  return `plrun-${pid}-${key}`;
}

function stepsFor(pid: string, t: TFn, values: Record<string, string>, set: SetField) {
  const textField = (
    pid2: string,
    key: string,
    label: string,
    placeholder: string,
    textarea = false,
    inputType: 'text' | 'number' = 'text',
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId(pid2, key)}>{label}</Label>
      {textarea ? (
        <Textarea
          id={fieldId(pid2, key)}
          rows={3}
          value={values[key] ?? ''}
          onChange={(e) => set(key)(e.target.value)}
          placeholder={placeholder}
          className="whitespace-pre-line"
        />
      ) : (
        <Input
          id={fieldId(pid2, key)}
          type={inputType}
          min={inputType === 'number' ? 0 : undefined}
          value={values[key] ?? ''}
          onChange={(e) => set(key)(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  const selectField = (pid2: string, key: string, label: string, options: { value: string; label: string }[]) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={values[key] ?? options[0]?.value} onValueChange={(v) => set(key)(v)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  switch (pid) {
    case 'pipeline-3d':
      return [
        { title: t('p3dS1'), content: textField(pid, 'productName', t('p3dName'), t('p3dNamePh')) },
        { title: t('p3dS2'), content: textField(pid, 'stylePrompt', t('p3dStyle'), t('p3dStylePh'), true) },
      ];
    case 'pipeline-shortform':
      return [
        { title: t('sfS1'), content: textField(pid, 'topic', t('sfS1'), t('sfTopicPh')) },
        {
          title: t('sfS2'),
          content: (
            <div className="grid gap-3 sm:grid-cols-2">
              {selectField(pid, 'tone', t('sfTone'), [
                { value: '정보형', label: t('toneInformative') },
                { value: '유머형', label: t('toneHumor') },
                { value: '감성형', label: t('toneEmotional') },
              ])}
              {selectField(pid, 'seconds', t('sfSeconds'), [
                { value: '15', label: '15' },
                { value: '30', label: '30' },
                { value: '60', label: '60' },
              ])}
            </div>
          ),
        },
      ];
    case 'pipeline-detailpage':
      return [
        {
          title: t('dpS1'),
          content: (
            <div className="space-y-3">
              {textField(pid, 'productName', t('dpName'), t('dpNamePh'))}
              {textField(pid, 'price', t('dpPrice'), '30000', false, 'number')}
            </div>
          ),
        },
        {
          title: t('dpS2'),
          content: (
            <div className="space-y-1.5">
              <Textarea
                id={fieldId(pid, 'features')}
                rows={4}
                value={values.features ?? ''}
                onChange={(e) => set('features')(e.target.value)}
                placeholder={t('dpFeaturesPh')}
                className="whitespace-pre-line"
              />
            </div>
          ),
        },
      ];
    case 'pipeline-game':
      return [
        {
          title: t('gameS1'),
          content: (
            <div className="space-y-3">
              {selectField(pid, 'genre', t('gameGenre'), [
                { value: '슈팅', label: t('genreShooter') },
                { value: '러너', label: t('genreRunner') },
                { value: '퍼즐', label: t('genrePuzzle') },
                { value: '생존', label: t('genreSurvival') },
              ])}
              {textField(pid, 'theme', t('gameTheme'), t('gameThemePh'))}
            </div>
          ),
        },
        {
          title: t('gameS2'),
          content: selectField(pid, 'difficulty', t('gameS2'), [
            { value: '쉬움', label: t('diffEasy') },
            { value: '보통', label: t('diffNormal') },
            { value: '어려움', label: t('diffHard') },
          ]),
        },
      ];
    case 'pipeline-copy':
      return [
        { title: t('copyS1'), content: textField(pid, 'product', t('copyS1'), t('copyProductPh')) },
        {
          title: t('copyS2'),
          content: (
            <div className="space-y-3">
              {textField(pid, 'audience', t('copyAudience'), t('copyAudiencePh'))}
              {selectField(pid, 'tone', t('copyTone'), [
                { value: '전문형', label: t('tonePro') },
                { value: '친근함', label: t('toneFriendly') },
                { value: '위트있게', label: t('toneWitty') },
              ])}
            </div>
          ),
        },
      ];
    default:
      return [];
  }
}
