'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertCircle, Check, FlaskConical, Loader2, RefreshCw, Sparkles, Wallet } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useRefreshSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import type { CreditStateDTO, JobDTO, ProviderDTO } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/empty-state';
import { StepForm } from '@/components/shared/step-form';
import { ViewHeader } from '@/components/shared/view-header';
import { cn } from '@/lib/utils';

type Aspect = '1:1' | '16:9' | '9:16';

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return String(e);
}

export default function LabView() {
  const t = useTranslations('lab');
  const tc = useTranslations('core');
  const params = useAppStore((s) => s.params);
  const navigate = useAppStore((s) => s.navigate);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const refreshSession = useRefreshSession();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [promptText, setPromptText] = useState<string>(() => params.promptText ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [aspect, setAspect] = useState<Aspect>('1:1');
  const [style, setStyle] = useState('');
  const [improving, setImproving] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [jobs, setJobs] = useState<JobDTO[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  const providersQ = useQuery({
    queryKey: ['providers'],
    queryFn: () => api.get<ProviderDTO[]>('/api/providers'),
  });
  const providers = providersQ.data ?? [];

  const session = useAppStore((s) => s.session);
  const creditsQ = useQuery({
    queryKey: ['credits'],
    queryFn: () => api.get<CreditStateDTO>('/api/credits'),
    enabled: !!session,
    staleTime: 10_000,
  });
  const balance = creditsQ.data?.balance ?? 0;

  const totalCost = providers
    .filter((p) => selected.includes(p.id))
    .reduce((sum, p) => sum + Math.round(p.costPerUnit * p.marginRate), 0);

  const hasActive = jobs.some((j) => j.status === 'queued' || j.status === 'running');
  const hasDone = jobs.some((j) => j.status === 'done' && j.resultArtifact);

  // ── polling (2s while any job queued/running) ──
  const jobsRef = useRef<JobDTO[]>([]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    if (!hasActive) return;
    const iv = setInterval(() => {
      const active = jobsRef.current.filter((j) => j.status === 'queued' || j.status === 'running');
      if (!active.length) return;
      void (async () => {
        try {
          const ids = active.map((j) => j.id).join(',');
          const updated = await api.get<JobDTO[]>(`/api/lab/jobs?ids=${ids}`);
          setJobs((prev) => {
            const byId = new Map(updated.map((j) => [j.id, j]));
            let changed = false;
            const next = prev.map((j) => {
              const u = byId.get(j.id);
              if (!u || u.status === j.status) return j;
              changed = true;
              return u;
            });
            return changed ? next : prev;
          });
        } catch {
          /* transient poll errors are ignored; next tick retries */
        }
      })();
    }, 2000);
    return () => clearInterval(iv);
  }, [hasActive]);

  // group jobs by provider, preserving generation order
  const groups = useMemo(() => {
    const map = new Map<string, { providerId: string; name: string; credit: number; jobs: JobDTO[] }>();
    for (const j of jobs) {
      let g = map.get(j.providerId);
      if (!g) {
        g = { providerId: j.providerId, name: j.providerName ?? j.providerId, credit: 0, jobs: [] };
        map.set(j.providerId, g);
      }
      g.jobs.push(j);
      g.credit += j.creditCharged;
    }
    return [...map.values()];
  }, [jobs]);

  const toastErr = (e: unknown) => toast({ title: tc('error'), description: errMsg(e), variant: 'destructive' });

  const toggleProvider = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleResult = (artifactId: string) =>
    setSelectedResults((prev) => (prev.includes(artifactId) ? prev.filter((x) => x !== artifactId) : [...prev, artifactId]));

  const improve = async () => {
    setImproving(true);
    try {
      const { improved } = await api.post<{ improved: string }>('/api/lab/improve-prompt', { text: promptText });
      if (improved) setPromptText(improved);
      toast({ title: t('improvedToast') });
    } catch (e) {
      toastErr(e);
    } finally {
      setImproving(false);
    }
  };

  const generate = async (providerIds?: string[]) => {
    if (!requireLogin()) return;
    const ids = providerIds ?? selected;
    if (!ids.length) return;
    setGenLoading(true);
    try {
      const data = await api.post<{ jobs: JobDTO[] }>('/api/lab/generate', {
        promptText,
        providerIds: ids,
        aspect,
        style: style || undefined,
        promptId: params.promptId || undefined,
      });
      setJobs((prev) => [...prev, ...data.jobs]);
      refreshSession();
      void qc.invalidateQueries({ queryKey: ['credits'] });
    } catch (e) {
      toastErr(e);
    } finally {
      setGenLoading(false);
    }
  };

  const publishSelected = async () => {
    if (!selectedResults.length) return;
    setPublishing(true);
    try {
      for (const artifactId of selectedResults) {
        await api.patch(`/api/artifacts/${artifactId}`, { status: 'published' });
      }
      toast({ title: t('publishedToast') });
      await qc.invalidateQueries({ queryKey: ['feed'] });
      const firstId = selectedResults[0];
      setSelectedResults([]);
      navigate('project', { id: firstId });
    } catch (e) {
      toastErr(e);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-w-0">
      <ViewHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        {/* LEFT: step form */}
        <Card className="p-6">
          <StepForm
            steps={[
              {
                title: t('stepPrompt'),
                content: (
                  <div className="space-y-2">
                    <Textarea
                      rows={5}
                      maxLength={1000}
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder={t('promptPh')}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={improving || !promptText.trim()}
                        onClick={() => void improve()}
                      >
                        {improving ? <Loader2 className="animate-spin" /> : <Sparkles />} {t('improvePrompt')}
                      </Button>
                      <span className="text-xs tabular-nums text-muted-foreground">{promptText.length}/1000</span>
                    </div>
                  </div>
                ),
              },
              {
                title: t('stepModels'),
                content: providers.length ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {providers.map((p) => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-1.5 select-none"
                      >
                        <Checkbox
                          checked={selected.includes(p.id)}
                          onCheckedChange={() => toggleProvider(p.id)}
                          className="size-3.5"
                        />
                        <span className="text-sm">{p.displayName}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {Math.round(p.costPerUnit * p.marginRate)}크
                        </span>
                      </label>
                    ))}
                  </div>
                ) : providersQ.isLoading ? (
                  <p className="text-xs text-muted-foreground">로딩 중...</p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('providersEmpty')}</p>
                ),
              },
              {
                title: t('stepSettings'),
                content: (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">{t('ratioLabel')}</p>
                      <RadioGroup value={aspect} onValueChange={(v) => setAspect(v as Aspect)} className="flex gap-4">
                        {(['1:1', '16:9', '9:16'] as const).map((r) => (
                          <div key={r} className="flex items-center gap-1.5">
                            <RadioGroupItem value={r} id={`lab-ratio-${r}`} />
                            <Label htmlFor={`lab-ratio-${r}`} className="cursor-pointer text-sm font-normal">
                              {r}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">{t('styleLabel')}</p>
                      <Select value={style || 'none'} onValueChange={(v) => setStyle(v === 'none' ? '' : v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('styleNone')}</SelectItem>
                          <SelectItem value="cinematic">{t('styleCinematic')}</SelectItem>
                          <SelectItem value="anime">{t('styleAnime')}</SelectItem>
                          <SelectItem value="product">{t('styleProduct')}</SelectItem>
                          <SelectItem value="pixar">{t('stylePixar')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ),
              },
            ]}
            footer={
              <div className="w-full space-y-3">
                {session && (
                  <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wallet className="size-3.5" /> {t('myCredits')}
                    </span>
                    <span className={cn(
                      'text-sm font-semibold tabular-nums',
                      totalCost > 0 && balance < totalCost ? 'text-red-500' : 'text-foreground',
                    )}>
                      {balance.toLocaleString()}
                    </span>
                  </div>
                )}

                {selected.length > 0 && (
                  <div className="space-y-1.5 rounded-md border border-dashed border-muted-foreground/30 px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">{t('estimatedCost')}</p>
                    {providers
                      .filter((p) => selected.includes(p.id))
                      .map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="truncate text-muted-foreground">{p.displayName}</span>
                          <span className="tabular-nums">{Math.round(p.costPerUnit * p.marginRate).toLocaleString()} 크레딧</span>
                        </div>
                      ))}
                    <div className="flex items-center justify-between border-t border-muted-foreground/20 pt-1.5 text-sm font-semibold">
                      <span>{t('totalEstimate')}</span>
                      <span className="tabular-nums text-primary">{totalCost.toLocaleString()} 크레딧</span>
                    </div>
                    <p className="text-[10px] leading-tight text-muted-foreground/60">
                      {t('costDisclaimer')}
                    </p>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  disabled={!promptText.trim() || selected.length === 0 || genLoading}
                  onClick={() => void generate()}
                >
                  {genLoading ? <Loader2 className="animate-spin" /> : <FlaskConical />} {t('generate')}
                </Button>
              </div>
            }
          />
        </Card>

        {/* RIGHT: results */}
        <div className="min-w-0 space-y-4">
          {jobs.length === 0 ? (
            <EmptyState
              icon={<FlaskConical className="size-5" />}
              title={t('emptyTitle')}
              description={t('emptyTip')}
              className="rounded-xl border border-dashed"
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {groups.map((g) => (
                  <Card key={g.providerId} className="overflow-hidden p-0 py-0">
                    <div className="flex items-center justify-between gap-2 p-3">
                      <span className="truncate text-sm font-medium">{g.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{g.credit} 크</span>
                    </div>
                    {g.jobs.map((job) => (
                      <div key={job.id} className="group relative aspect-square border-t">
                        {(job.status === 'queued' || job.status === 'running') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                            <Loader2 className="size-6 animate-spin text-primary" />
                          </div>
                        )}
                        {job.status === 'failed' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                            <AlertCircle className="size-6 text-red-500" />
                            <p className="line-clamp-2 text-xs text-muted-foreground">{job.error || t('genFailed')}</p>
                            <p className="text-xs text-muted-foreground/70">{t('refunded')}</p>
                          </div>
                        )}
                        {job.status === 'done' && job.resultArtifact && (
                          <>
                            <img
                              src={job.resultArtifact.fileUrl ?? ''}
                              alt={job.resultArtifact.title}
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover"
                              draggable={false}
                            />
                            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              <button
                                type="button"
                                title={t('regenerate')}
                                onClick={() => void generate([job.providerId])}
                                className="pointer-events-auto flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
                              >
                                <RefreshCw className="size-4" />
                              </button>
                              <button
                                type="button"
                                title={t('selectToggle')}
                                onClick={() => toggleResult(job.resultArtifact!.id)}
                                className={cn(
                                  'pointer-events-auto flex size-8 items-center justify-center rounded-full border-2 backdrop-blur-sm transition',
                                  selectedResults.includes(job.resultArtifact.id)
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-white/80 bg-black/40 text-white hover:bg-black/60',
                                )}
                              >
                                <Check className="size-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </Card>
                ))}
              </div>

              {hasDone && (
                <Card className="sticky bottom-4 z-20 flex items-center gap-3 p-3">
                  <span className="text-sm">{t('selectedCount', { n: selectedResults.length })}</span>
                  <span className="flex-1" />
                  <Button
                    size="sm"
                    disabled={selectedResults.length === 0 || publishing}
                    onClick={() => void publishSelected()}
                  >
                    {publishing ? <Loader2 className="animate-spin" /> : <Check />} {t('publishSelected')}
                  </Button>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
