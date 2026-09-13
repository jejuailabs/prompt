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
import type { ArtifactDTO, Asset3dProjectDTO, Asset3dSubtrack } from '@/lib/types';
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

  return <AssetGalleryLanding session={Boolean(session)} onNew={() => session ? setMode('create') : useAppStore.getState().setLoginOpen(true)} onOpenProject={(id) => { setSelectedProjectId(id); setMode('detail'); }} />;
}

function AssetGalleryLanding({ session, onNew, onOpenProject }: { session: boolean; onNew: () => void; onOpenProject: (id: string) => void }) {
  const [tab, setTab] = useState<'gallery' | 'mine'>('gallery');
  const publicAssets = useQuery({
    queryKey: ['asset-studio-gallery'],
    queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=feed&type=3d_asset&limit=12'),
  });
  const mine = useQuery({
    queryKey: ['asset-studio-projects'],
    queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=mine&type=3d_asset&limit=24'),
    enabled: session,
  });
  const examples = [
    ['흑요석 찻잔', '제품 · Blender 기반', 'from-stone-950 via-stone-700 to-amber-200'],
    ['제주 돌담 마을', '공간 · 환경 에셋', 'from-emerald-950 via-teal-700 to-cyan-200'],
    ['캐주얼 백팩', '제품 · 리텍스처 가능', 'from-slate-950 via-blue-800 to-slate-200'],
    ['단편 영화 세트', '장소 · 씬 패키지', 'from-violet-950 via-fuchsia-700 to-pink-200'],
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 pb-10">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-zinc-950 via-slate-900 to-emerald-950 px-6 py-9 text-white shadow-xl sm:px-10">
        <div className="absolute -right-20 top-0 size-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-200"><Box className="size-4" /> PLAYLAB ASSET STUDIO</div><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">좋은 장면은 좋은<br />에셋에서 시작됩니다.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">캐릭터, 제품, 장소, Blender 씬을 탐색하고 내 영상 프로젝트의 기준 에셋으로 가져오세요.</p></div>
          <Button className="bg-white text-slate-950 hover:bg-slate-100" onClick={onNew}><Sparkles className="size-4" /> 새 에셋 만들기</Button>
        </div>
      </section>
      <section className="rounded-3xl border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between border-b pb-4"><div className="flex gap-1 rounded-xl bg-muted p-1"><button type="button" onClick={() => setTab('gallery')} className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === 'gallery' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Asset Gallery</button><button type="button" onClick={() => setTab('mine')} className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === 'mine' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>내 에셋</button></div><Button variant="outline" size="sm" onClick={onNew}>+ 새 에셋</Button></div>
        {tab === 'gallery' ? <><div className="mt-5"><h2 className="font-semibold">다른 제작자가 만든 기준 에셋</h2><p className="mt-1 text-sm text-muted-foreground">영상 프로젝트로 가져가 레퍼런스, 첫 프레임 또는 Blender 씬으로 사용하세요.</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{examples.map(([title, subtitle, gradient]) => <article key={title} className="overflow-hidden rounded-2xl border bg-background"><div className={`relative aspect-[4/5] bg-gradient-to-br ${gradient}`}><div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_25%,rgba(255,255,255,.45),transparent_20%),linear-gradient(145deg,transparent_35%,rgba(0,0,0,.45))]" /><Badge className="absolute left-3 top-3 border-0 bg-black/40 text-white hover:bg-black/40">공개 에셋</Badge><Box className="absolute bottom-4 right-4 size-10 text-white/70" /></div><div className="p-3"><p className="font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p><Button variant="outline" size="sm" className="mt-3 w-full" onClick={onNew}>이 에셋으로 시작</Button></div></article>)}{publicAssets.data?.map((asset) => <article key={asset.id} className="overflow-hidden rounded-2xl border bg-background"><div className="relative aspect-[4/5] bg-muted">{asset.fileUrl ? <img src={asset.fileUrl} alt="" className="size-full object-cover" /> : <Box className="absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />}</div><div className="p-3"><p className="truncate font-medium">{asset.title}</p><p className="mt-1 text-xs text-muted-foreground">by {asset.owner.username}</p></div></article>)}</div></> : <div className="mt-6">{!session ? <div className="rounded-2xl border border-dashed p-12 text-center"><Box className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">내 에셋을 모아보세요</h2><p className="mt-1 text-sm text-muted-foreground">로그인하면 만든 캐릭터, 제품, 장소 에셋을 프로젝트별로 관리합니다.</p><Button className="mt-5" onClick={onNew}>로그인하고 시작</Button></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(mine.data ?? []).map((asset) => <button type="button" key={asset.id} onClick={() => onOpenProject(asset.id)} className="rounded-2xl border p-4 text-left hover:border-primary/50"><Box className="size-6 text-primary" /><p className="mt-6 font-medium">{asset.title}</p><p className="mt-1 text-xs text-muted-foreground">{asset.description || '에셋 프로젝트'}</p></button>)}{!mine.isLoading && !mine.data?.length && <button type="button" onClick={onNew} className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed text-muted-foreground hover:border-primary hover:text-primary"><Sparkles className="size-6" /><span className="mt-2 text-sm font-medium">첫 에셋 만들기</span></button>}</div>}</div>}
      </section>
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
