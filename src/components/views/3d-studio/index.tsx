'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Box,
  Check,
  ChevronRight,
  Download,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useRefreshSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import type { Asset3dProjectDTO, Asset3dSubtrack } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StepForm } from '@/components/shared/step-form';

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return String(e);
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function Studio3dView() {
  const t = useTranslations('studio3d');
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
  const t = useTranslations('studio3d');
  const session = useAppStore((s) => s.session);

  const q = useQuery({
    queryKey: ['3d-projects'],
    queryFn: () => api.get<Asset3dProjectDTO[]>('/api/3d-studio/projects'),
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

  const subtrackLabel: Record<Asset3dSubtrack, string> = {
    character: t('subtrackCharacter'),
    product: t('subtrackProduct'),
    floorplan: t('subtrackFloorplan'),
  };

  return (
    <div className="space-y-3">
      {projects.map((p) => (
        <Card
          key={p.id}
          className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/50"
          onClick={() => onSelect(p.id)}
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
            <Box className="size-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{p.title || t('statusDraft')}</p>
            <p className="text-xs text-muted-foreground">{subtrackLabel[p.subtrack]}</p>
          </div>
          <StatusBadge status={p.status} />
          <ChevronRight className="size-4 text-muted-foreground" />
        </Card>
      ))}
    </div>
  );
}

// ─── Create Project Form ──────────────────────────────────────────────────────

function CreateProjectForm({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const t = useTranslations('studio3d');
  const tc = useTranslations('core');
  const { toast } = useToast();
  const refreshSession = useRefreshSession();

  const [subtrack, setSubtrack] = useState<Asset3dSubtrack>('character');
  const [quality, setQuality] = useState('standard');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post<Asset3dProjectDTO>('/api/3d-studio/projects', {
        title: title.trim() || `3D ${subtrack}`,
        subtrack,
        styleOptions: { quality },
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
              title: t('stepSubtrack'),
              content: (
                <div className="grid gap-3 sm:grid-cols-3">
                  {(['character', 'product', 'floorplan'] as const).map((st) => (
                    <Card
                      key={st}
                      className={`cursor-pointer p-4 transition-colors ${subtrack === st ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => setSubtrack(st)}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Box className="size-5 text-primary" />
                        <span className="font-medium">{t(`subtrack${st.charAt(0).toUpperCase() + st.slice(1)}` as any)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t(`subtrack${st.charAt(0).toUpperCase() + st.slice(1)}Desc` as any)}
                      </p>
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              title: t('stepUpload'),
              content: (
                <div className="space-y-3">
                  <Label>{t('uploadHint')}</Label>
                  <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed">
                    <Button variant="ghost" className="text-muted-foreground">
                      <ImagePlus className="size-5" /> {t('uploadBtn')}
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              title: t('stepOptions'),
              content: (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('qualityLabel')}</Label>
                    <Select value={quality} onValueChange={setQuality}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{t('qualityDraft')}</SelectItem>
                        <SelectItem value="standard">{t('qualityStandard')}</SelectItem>
                        <SelectItem value="high">{t('qualityHigh')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ),
            },
          ]}
          footer={
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t('estimatedCredits')}</p>
              <Button disabled={submitting} onClick={() => void submit()}>
                {submitting ? <Loader2 className="animate-spin" /> : <Wand2 />} {t('createProject')}
              </Button>
            </div>
          }
        />
      </Card>
    </div>
  );
}

// ─── Project Detail ───────────────────────────────────────────────────────────

function ProjectDetail({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const t = useTranslations('studio3d');
  const tc = useTranslations('core');

  const q = useQuery({
    queryKey: ['3d-project', projectId],
    queryFn: () => api.get<Asset3dProjectDTO>(`/api/3d-studio/projects/${projectId}`),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'generating' || s === 'processing' ? 2000 : false;
    },
  });

  if (q.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
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
  const outputs = project.outputs ?? [];
  const isWorking = project.status === 'generating' || project.status === 'processing';

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Button variant="ghost" size="sm" className="-ml-2 mb-4 h-7 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="size-4" /> {t('back')}
      </Button>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
          <Box className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t(`subtrack${project.subtrack.charAt(0).toUpperCase() + project.subtrack.slice(1)}` as any)}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {isWorking && (
        <Card className="mb-6 flex items-center gap-3 p-4">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-sm font-medium">{t('creating')}</span>
        </Card>
      )}

      {/* 3D viewer placeholder */}
      {outputs.length > 0 && (
        <div className="space-y-4">
          {outputs.map((output) => (
            <Card key={output.id} className="overflow-hidden">
              <div className="flex h-80 items-center justify-center bg-muted">
                {output.thumbnailUrl ? (
                  <img src={output.thumbnailUrl} alt="" className="h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <RotateCcw className="mx-auto mb-2 size-12" />
                    <p className="text-sm">{t('viewer3d')}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                {output.polyCount && (
                  <p className="text-sm text-muted-foreground">
                    {t('polyCount')}: {output.polyCount.toLocaleString()}
                  </p>
                )}
                {output.dimensions && (
                  <p className="text-sm text-muted-foreground">
                    {t('dimensions')}: {output.dimensions.width} × {output.dimensions.height} × {output.dimensions.depth}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="size-3" /> {t('downloadGlb')}
                  </Button>
                  {output.fbxUrl && (
                    <Button variant="outline" size="sm">
                      <Download className="size-3" /> {t('downloadFbx')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {project.status === 'done' && (
        <div className="mt-4 flex gap-2">
          <Button>
            <Check className="size-4" /> {t('publish')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('studio3d');
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: t('statusDraft'), variant: 'outline' },
    generating: { label: t('statusGenerating'), variant: 'secondary' },
    processing: { label: t('statusProcessing'), variant: 'secondary' },
    done: { label: t('statusDone'), variant: 'default' },
    failed: { label: t('statusFailed'), variant: 'destructive' },
  };
  const entry = map[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
