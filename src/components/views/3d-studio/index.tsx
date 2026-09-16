'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Box,
  ChevronRight,
  Download,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Play,
  Wand2,
} from 'lucide-react';
import { api, ApiError, uploadFile } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useRefreshSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import type { ArtifactDTO, Asset3dProjectDTO, Asset3dSubtrack, Asset3dWorkflowMode } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StepForm } from '@/components/shared/step-form';
import { ModelPreview } from './model-preview';
import { MotionLibrary } from './motion-library';

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
  const [workflowMode, setWorkflowMode] = useState<Asset3dWorkflowMode>('automatic');
  const [title, setTitle] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const uploadImages = async (files: FileList | null) => {
    const selected = Array.from(files ?? []).slice(0, 1 - imageUrls.length);
    if (!selected.length) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(selected.map((file) => uploadFile(file)));
      setImageUrls((current) => [...current, ...uploads.map((item) => item.url)].slice(0, 5));
    } catch (error) {
      toast({ title: tc('error'), description: errMsg(error), variant: 'destructive' });
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const submit = async () => {
    if (submitting || uploading || imageUrls.length !== 1) return;
    setSubmitting(true);
    try {
      const res = await api.post<Asset3dProjectDTO>('/api/3d-studio/projects', {
        title: title.trim() || `3D ${subtrack}`,
        subtrack,
        inputImageUrls: imageUrls,
        styleOptions: { quality },
        workflowMode,
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
                  {(['character', 'product'] as const).map((st) => (
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
                  <Label>대표 이미지 한 장을 업로드해주세요. 단일 대상이 잘 보이는 사진을 권장합니다.</Label>
                  <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadImages(event.target.files)} />
                  <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed p-4">
                    {imageUrls.length ? <div className="flex w-full flex-wrap justify-center gap-2">{imageUrls.map((url) => <div key={url} className="relative size-20 overflow-hidden rounded-lg border bg-muted"><img src={url} alt="업로드한 참조 이미지" className="size-full object-cover" /><button type="button" onClick={() => setImageUrls((current) => current.filter((item) => item !== url))} className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white">×</button></div>)}{imageUrls.length < 5 && <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} {t('uploadBtn')}</Button>}</div> : <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus className="size-5" />} {uploading ? '업로드 중…' : t('uploadBtn')}
                    </Button>
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">{imageUrls.length ? '대표 이미지 선택됨 · 변경하려면 ×로 제거 후 선택하세요.' : 'PNG, JPG, WebP · 이미지 선택 후 미리보기가 표시됩니다.'}</p>
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
                        <SelectItem value="standard">{t('qualityStandard')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>생성 방식</Label>
                    <Select value={workflowMode} onValueChange={(value) => setWorkflowMode(value as Asset3dWorkflowMode)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automatic">자동 진행 · 3D → 리깅 → FBX 번들</SelectItem>
                        <SelectItem value="guided">단계 확인 · 중간 GLB를 보고 다음 단계 진행</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs leading-5 text-muted-foreground">단계 확인 모드는 3D 결과를 확인한 뒤 자동 리깅과 FBX 변환을 시작합니다.</p>
                  </div>
                </div>
              ),
            },
          ]}
          footer={
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">70 크레딧 · 실패 시 환불 · GLB 출력</p>
              <Button disabled={submitting || uploading || imageUrls.length !== 1} onClick={() => void submit()}>
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
  const [advancing, setAdvancing] = useState(false);
  const [heightMeters, setHeightMeters] = useState('1.70');
  const [orientationConfirmed, setOrientationConfirmed] = useState(false);
  const [jointNotes, setJointNotes] = useState('');
  const advance = async (stage: 'blender' | 'rigging_animation') => {
    setAdvancing(true);
    try { await api.post(`/api/3d-studio/projects/${projectId}/advance`, stage === 'rigging_animation' ? { stage, heightMeters: Number(heightMeters), orientationConfirmed, jointNotes } : { stage }); await q.refetch(); }
    finally { setAdvancing(false); }
  };

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
          <span className="text-sm font-medium">{project.status === 'generating' ? '3D 생성 워커 준비·대기 중입니다. 첫 실행은 모델 로딩에 시간이 걸립니다.' : '이미지를 3D 모델로 변환하고 있습니다. 완료되면 뷰어가 표시됩니다.'}</span>
        </Card>
      )}

      {project.status === 'failed' && (
        <Card className="mb-6 border-destructive/30 bg-destructive/[.04] p-5">
          <p className="font-semibold text-destructive">3D 에셋 생성에 실패했습니다</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.error || 'Blender 워커가 작업을 완료하지 못했습니다. 참조 이미지를 확인한 뒤 새 작업으로 다시 시도해주세요.'}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onBack}><RotateCcw className="size-3.5" /> 새 에셋으로 다시 만들기</Button>
        </Card>
      )}

      {project.workflowStages?.length ? (
        <Card className="mb-6 p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">3D 제작 단계</h2><p className="mt-1 text-sm text-muted-foreground">{project.workflowMode === 'guided' ? '중간 결과를 확인하고 직접 다음 단계로 진행합니다.' : '각 단계가 성공하면 자동으로 다음 단계로 이어집니다.'}</p></div><Badge variant="outline">{project.workflowMode === 'guided' ? '단계 확인' : '자동 완주'}</Badge></div>
          <div className="space-y-3">
            {project.workflowStages.map((stage) => <div key={stage.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{stage.title}</p><Badge variant={stage.status === 'completed' ? 'default' : stage.status === 'failed' ? 'destructive' : 'secondary'}>{stage.status === 'completed' ? '완료' : stage.status === 'running' ? '진행 중' : stage.status === 'awaiting_approval' ? '다음 단계 대기' : stage.status === 'failed' ? '실패' : '대기'}</Badge></div>
              <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p>
              {stage.error && <p className="mt-2 text-sm text-destructive">{stage.error}</p>}
              {stage.previewGlbUrl && <div className="mt-3 rounded-lg bg-muted"><ModelPreview src={stage.previewGlbUrl} /></div>}
              {stage.id === 'blender' && stage.status === 'awaiting_approval' && (project.workflowMode === 'guided' || Boolean(stage.error)) && <Button className="mt-3" size="sm" onClick={() => void advance('blender')} disabled={advancing}><Play className="size-3.5" /> {advancing ? 'Blender 준비 요청 중…' : '이 3D 결과로 Blender 준비 진행'}</Button>}
              {stage.id === 'rigging_animation' && stage.status === 'awaiting_approval' && <div className="mt-3 space-y-3 rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">캐릭터의 크기와 방향을 확인하세요. 뼈대와 웨이트를 자동 생성한 뒤 FBX로 변환합니다. 아래 메모는 기록용이며 관절을 수정하지는 않습니다. 관절 직접 편집과 동작 클립 연결은 아직 지원하지 않습니다.</p><div className="grid gap-2 sm:grid-cols-2"><Label className="text-xs">캐릭터 키(m)<input className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" type="number" min="0.5" max="3" step="0.01" value={heightMeters} onChange={(event) => setHeightMeters(event.target.value)} /></Label><Label className="flex items-end gap-2 pb-1 text-xs"><input type="checkbox" checked={orientationConfirmed} onChange={(event) => setOrientationConfirmed(event.target.checked)} /> 얼굴이 +Z 전방을 향함</Label></div><textarea value={jointNotes} onChange={(event) => setJointNotes(event.target.value)} placeholder="수동 보정 메모: 예) 팔이 몸통에 붙어 있음, 발 위치를 넓혀야 함" className="min-h-16 w-full rounded-md border bg-background p-2 text-sm" /><Button size="sm" onClick={() => void advance('rigging_animation')} disabled={advancing || !orientationConfirmed}><Play className="size-3.5" /> {advancing ? '리깅 요청 중…' : 'SkinTokens 자동 리깅 요청'}</Button></div>}
            </div>)}
          </div>
        </Card>
      ) : null}

      {/* Display the generated mesh, not the input thumbnail. */}
      {project.generationTiming?.executionTimeMs !== undefined && (
        <p className="mb-4 text-sm text-muted-foreground">3D 생성 처리 {Math.round(project.generationTiming.executionTimeMs / 1000)}초 · 워커 대기 {Math.round((project.generationTiming.delayTimeMs ?? 0) / 1000)}초</p>
      )}
      {outputs.length > 0 && (
        <div className="space-y-4">
          {outputs.map((output) => (
            <Card key={output.id} className="overflow-hidden">
              <div className="flex min-h-80 items-center justify-center bg-muted">
                {output.riggedGlbUrl || output.glbUrl ? <ModelPreview src={output.riggedGlbUrl ?? output.glbUrl} /> : output.thumbnailUrl ? (
                  <img src={output.thumbnailUrl} alt="" className="h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <RotateCcw className="mx-auto mb-2 size-12" />
                    <p className="text-sm">{t('viewer3d')}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <p className={`rounded-md p-3 text-sm ${output.riggedFbxUrl ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>{output.riggedFbxUrl ? '리깅된 캐릭터 번들 · 아래 모션 라이브러리에서 동작을 적용하고 관절 변형을 검수하세요.' : '생성 메시 · 게임 캐릭터 준비 미완료. 형상 검토, 리깅·관절 변형 및 Unity 임포트 검증이 필요합니다.'}</p>
                <MotionLibrary projectId={projectId} riggedGlbUrl={output.riggedGlbUrl} />
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
                  {output.glbUrl && <Button variant="outline" size="sm" asChild><a href={output.glbUrl} download target="_blank" rel="noreferrer"><Download className="size-3" /> {t('downloadGlb')}</a></Button>}
                  {output.fbxUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={output.fbxUrl} download target="_blank" rel="noreferrer"><Download className="size-3" /> {t('downloadFbx')}</a>
                    </Button>
                  )}
                  {output.riggedFbxUrl && <Button variant="default" size="sm" asChild><a href={output.riggedFbxUrl} download target="_blank" rel="noreferrer"><Download className="size-3" /> 리깅된 FBX</a></Button>}
                  {output.unityManifestUrl && <Button variant="outline" size="sm" asChild><a href={output.unityManifestUrl} download target="_blank" rel="noreferrer">Unity 머티리얼 정보</a></Button>}
                </div>
                {output.textureUrls && Object.keys(output.textureUrls).length > 0 && <div><p className="mb-2 text-sm font-medium">생성 텍스처</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(output.textureUrls).map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border"><img src={url} alt={name} className="aspect-square w-full object-cover" /><span className="block truncate p-2 text-xs text-muted-foreground">{name}</span></a>)}</div></div>}
                {output.animationUrls && Object.keys(output.animationUrls).length > 0 && <div><p className="mb-2 text-sm font-medium">기본 애니메이션</p><div className="flex flex-wrap gap-2">{Object.entries(output.animationUrls).map(([name, url]) => <Button key={name} variant="outline" size="sm" asChild><a href={url} download target="_blank" rel="noreferrer"><Download className="size-3" /> {name.replace(/_url$/, '')}</a></Button>)}</div></div>}
              </div>
            </Card>
          ))}
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
