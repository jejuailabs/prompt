'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Film,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useRefreshSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import type { VideoProjectDTO, VideoShotDTO, RenderProfile, VideoModel } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StepForm } from '@/components/shared/step-form';

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return String(e);
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function VideoStudioView() {
  const t = useTranslations('videoStudio');
  const tc = useTranslations('core');
  const navigate = useAppStore((s) => s.navigate);
  const session = useAppStore((s) => s.session);

  const [mode, setMode] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (mode === 'create') {
    return <CreateProjectForm onBack={() => setMode('list')} onCreated={(id) => { setSelectedProjectId(id); setMode('detail'); }} />;
  }

  if (mode === 'detail' && selectedProjectId) {
    return <ProjectDetail projectId={selectedProjectId} onBack={() => { setSelectedProjectId(null); setMode('list'); }} />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <ViewHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button onClick={() => session ? setMode('create') : useAppStore.getState().setLoginOpen(true)}>
            <Sparkles className="size-4" /> {t('newProject')}
          </Button>
        }
      />
      <ProjectList onSelect={(id) => { setSelectedProjectId(id); setMode('detail'); }} />
    </div>
  );
}

// ─── Project List ─────────────────────────────────────────────────────────────

function ProjectList({ onSelect }: { onSelect: (id: string) => void }) {
  const t = useTranslations('videoStudio');
  const locale = useAppStore((s) => s.locale);
  const session = useAppStore((s) => s.session);

  const q = useQuery({
    queryKey: ['video-projects'],
    queryFn: () => api.get<VideoProjectDTO[]>('/api/video-studio/projects'),
    enabled: !!session,
  });

  if (!session) {
    return <EmptyState title={t('noProjects')} description={t('noProjectsDesc')} />;
  }

  if (q.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const projects = q.data ?? [];
  if (projects.length === 0) {
    return <EmptyState title={t('noProjects')} description={t('noProjectsDesc')} />;
  }

  return (
    <div className="space-y-3">
      {projects.map((p) => (
        <Card
          key={p.id}
          className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/50"
          onClick={() => onSelect(p.id)}
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
            <Film className="size-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{p.title || t('statusDraft')}</p>
            <p className="text-xs text-muted-foreground">
              {p.targetDurationSec}s · {p.shots?.length ?? 0} {t('shot')}
            </p>
          </div>
          <ProjectStatusBadge status={p.status} />
          <ChevronRight className="size-4 text-muted-foreground" />
        </Card>
      ))}
    </div>
  );
}

// ─── Create Project Form ──────────────────────────────────────────────────────

function CreateProjectForm({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const t = useTranslations('videoStudio');
  const tc = useTranslations('core');
  const { toast } = useToast();
  const refreshSession = useRefreshSession();

  const [script, setScript] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [duration, setDuration] = useState('60');
  const [submitting, setSubmitting] = useState(false);

  const ready = script.trim().length > 10;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post<VideoProjectDTO>('/api/video-studio/projects', {
        script: script.trim(),
        style,
        targetDurationSec: Number(duration),
      });
      refreshSession();
      onCreated(res.id);
    } catch (e) {
      toast({ title: tc('error'), description: errMsg(e), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Button variant="ghost" size="sm" className="-ml-2 mb-4 h-7 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="size-4" /> {t('back')}
      </Button>

      <h2 className="mb-6 text-2xl font-bold tracking-tight">{t('newProject')}</h2>

      <Card className="p-6">
        <StepForm
          steps={[
            {
              title: t('stepScript'),
              content: (
                <Textarea
                  rows={6}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder={t('scriptPh')}
                  className="whitespace-pre-line"
                />
              ),
            },
            {
              title: t('stepStyle'),
              content: (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('styleLabel')}</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">{t('styleCinematic')}</SelectItem>
                        <SelectItem value="informative">{t('styleInformative')}</SelectItem>
                        <SelectItem value="humor">{t('styleHumor')}</SelectItem>
                        <SelectItem value="emotional">{t('styleEmotional')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('durationLabel')}</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">{t('sec15')}</SelectItem>
                        <SelectItem value="30">{t('sec30')}</SelectItem>
                        <SelectItem value="60">{t('sec60')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ),
            },
          ]}
          footer={
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t('creditNote')}</p>
              <Button disabled={!ready || submitting} onClick={() => void submit()}>
                {submitting ? <Loader2 className="animate-spin" /> : <Wand2 />} {t('createProject')}
              </Button>
            </div>
          }
        />
      </Card>
    </div>
  );
}

// ─── Project Detail (Storyboard) ──────────────────────────────────────────────

function ProjectDetail({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const t = useTranslations('videoStudio');
  const tc = useTranslations('core');
  const { toast } = useToast();

  const q = useQuery({
    queryKey: ['video-project', projectId],
    queryFn: () => api.get<VideoProjectDTO>(`/api/video-studio/projects/${projectId}`),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'generating' || s === 'rendering' || s === 'storyboard' ? 2000 : false;
    },
  });

  if (q.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <EmptyState
        title={tc('error')}
        description={errMsg(q.error)}
        action={<Button variant="outline" size="sm" onClick={onBack}>{t('back')}</Button>}
      />
    );
  }

  const project = q.data;
  const shots = project.shots ?? [];
  const isWorking = project.status === 'generating' || project.status === 'rendering' || project.status === 'storyboard';

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Button variant="ghost" size="sm" className="-ml-2 mb-4 h-7 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="size-4" /> {t('back')}
      </Button>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
          <Film className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.title || t('statusDraft')}</h1>
          <p className="text-sm text-muted-foreground">
            {project.targetDurationSec}s · {shots.length} {t('shot')}
          </p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {isWorking && (
        <Card className="mb-6 flex items-center gap-3 p-4">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-sm font-medium">{t('creating')}</span>
        </Card>
      )}

      {/* Storyboard timeline */}
      {shots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('storyboard')}</h2>
            {project.status === 'editing' && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Play className="size-4" /> {t('generatePreview')}
                </Button>
                <Button size="sm">
                  <Zap className="size-4" /> {t('generateAll')}
                </Button>
              </div>
            )}
          </div>

          {shots.map((shot) => (
            <ShotCard key={shot.id} shot={shot} />
          ))}
        </div>
      )}

      {/* Final result */}
      {project.status === 'done' && project.resultArtifactId && (
        <Card className="mt-6 space-y-4 p-6">
          <h3 className="font-semibold">{t('statusDone')}</h3>
          <div className="flex gap-2">
            <Button>
              <Check className="size-4" /> {t('publish')}
            </Button>
            <Button variant="outline">{t('download')}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Shot Card ────────────────────────────────────────────────────────────────

function ShotCard({ shot }: { shot: VideoShotDTO }) {
  const t = useTranslations('videoStudio');
  const [expanded, setExpanded] = useState(false);

  const modelLabel: Partial<Record<VideoModel, string>> = {
    'h3': 'H3 Unified',
    'h3-fl2va': 'H3 FL2VA',
    'h3-ref2va': 'H3 Ref2VA',
    'wan26': 'Wan 2.6',
    'wan25': 'Wan 2.5',
    'wan22': 'Wan 2.2',
    'ltx25': 'LTX 2.5',
    'ltx23': 'LTX 2.3',
    'ltx2': 'LTX 2.0',
  };

  const profileLabel: Record<RenderProfile, string> = {
    preview: t('profilePreview'),
    standard: t('profileStandard'),
    hero: t('profileHero'),
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        {/* thumbnail */}
        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted">
          {shot.thumbnailUrl ? (
            <img src={shot.thumbnailUrl} alt="" className="size-full rounded-lg object-cover" />
          ) : (
            <Film className="size-6 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {t('shot')} {shot.shotIndex + 1}
            </span>
            <Badge variant="secondary" className="text-xs">
              {shot.startSec.toFixed(1)}s – {shot.endSec.toFixed(1)}s
            </Badge>
            <ShotStatusBadge status={shot.status} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{shot.narration}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="text-xs">{modelLabel[shot.model] ?? shot.model}</Badge>
          <Badge variant="outline" className="text-xs">{shot.renderProfile}</Badge>
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t bg-muted/10 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">{t('narration')}</Label>
              <p className="mt-1 text-sm">{shot.narration}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('prompt')}</Label>
              <p className="mt-1 text-sm">{shot.prompt}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t('model')}</Label>
              <p className="mt-1 text-sm">{modelLabel[shot.model] ?? shot.model}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('profile')}</Label>
              <p className="mt-1 text-sm">{profileLabel[shot.renderProfile]}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('importance')}</Label>
              <Progress value={shot.importance * 100} className="mt-2" />
            </div>
          </div>

          {/* QC result */}
          {shot.qcResult && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">QC ({shot.qcAttempts} attempts)</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(shot.qcResult).map(([key, val]) => {
                  const label = t(`qc${key.charAt(0).toUpperCase() + key.slice(1)}` as any);
                  return (
                    <Badge key={key} variant={val.pass ? 'default' : 'destructive'} className="text-xs">
                      {label}: {(val.score * 100).toFixed(0)}%
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="size-3" /> {t('regenerate')}
            </Button>
            {shot.renderProfile !== 'hero' && (
              <Button variant="outline" size="sm">
                <Zap className="size-3" /> {t('upgradeHero')}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Status Badges ────────────────────────────────────────────────────────────

function ProjectStatusBadge({ status }: { status: string }) {
  const t = useTranslations('videoStudio');
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: t('statusDraft'), variant: 'outline' },
    storyboard: { label: t('statusStoryboard'), variant: 'secondary' },
    generating: { label: t('statusGenerating'), variant: 'secondary' },
    editing: { label: t('statusEditing'), variant: 'default' },
    rendering: { label: t('statusRendering'), variant: 'secondary' },
    done: { label: t('statusDone'), variant: 'default' },
    failed: { label: t('statusFailed'), variant: 'destructive' },
  };
  const entry = map[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function ShotStatusBadge({ status }: { status: string }) {
  const t = useTranslations('videoStudio');
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: t('shotPending'), variant: 'outline' },
    preview: { label: t('shotPreview'), variant: 'outline' },
    generating: { label: t('shotGenerating'), variant: 'secondary' },
    qc: { label: t('shotQc'), variant: 'secondary' },
    passed: { label: t('shotPassed'), variant: 'default' },
    failed: { label: t('shotFailed'), variant: 'destructive' },
    done: { label: t('shotDone'), variant: 'default' },
  };
  const entry = map[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={entry.variant} className="text-xs">{entry.label}</Badge>;
}
