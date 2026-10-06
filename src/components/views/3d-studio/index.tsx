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
import { GenerationPreview } from './generation-preview';
import { MotionLibrary } from './motion-library';
import { ArtifactCard } from '@/components/shared/artifact-card';
import { PreviewNotice } from '@/components/runtime-context';

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
  const publicAssets = useQuery({ queryKey: ['asset-studio-gallery'], queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=feed&type=3d_asset&limit=12') });
  return <div className="editorial-page space-y-7">
    <ViewHeader eyebrow="THE EXPERIMENT ROOM / 3D" image="/uploads/seed/thumb-isometric.png" title="3D 에셋 스튜디오" subtitle="이미지를 입체로 만들고, 완성한 에셋을 함께 살펴보세요." actions={<Button onClick={onNew}>새 에셋 만들기 ↗</Button>} />
    <PreviewNotice />
    <div className="flex gap-2"><Button variant={tab === 'gallery' ? 'default' : 'outline'} onClick={() => setTab('gallery')}>공개 에셋</Button><Button variant={tab === 'mine' ? 'default' : 'outline'} onClick={() => setTab('mine')}>내 프로젝트</Button></div>
    {tab === 'gallery' ? publicAssets.isLoading ? <p role="status">공개 에셋을 불러오는 중이에요.</p> : publicAssets.isError ? <EmptyState title="에셋을 불러오지 못했어요." action={<Button onClick={() => void publicAssets.refetch()}>다시 불러오기</Button>} /> : publicAssets.data?.length ? <div className="works-grid">{publicAssets.data.map(asset => <ArtifactCard key={asset.id} artifact={asset} onClick={() => useAppStore.getState().navigate('project', { id: asset.id })} />)}</div> : <EmptyState title="아직 공개된 3D 에셋이 없어요." description="에셋을 만들고 공개하면 이곳에서 함께 볼 수 있어요." action={<Button onClick={onNew}>첫 에셋 만들기</Button>} /> : session ? <ProjectList onSelect={onOpenProject} /> : <EmptyState title="로그인하면 내 3D 프로젝트를 볼 수 있어요." action={<Button onClick={onNew}>로그인</Button>} />}
  </div>;
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

  if (q.isError) return <EmptyState title="프로젝트를 불러오지 못했어요." action={<Button onClick={() => void q.refetch()}>다시 불러오기</Button>} />;
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
  const { toast } = useToast();

  const q = useQuery({
    queryKey: ['3d-project', projectId],
    queryFn: () => api.get<Asset3dProjectDTO>(`/api/3d-studio/projects/${projectId}`),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'generating' || s === 'processing' ? 2000 : false;
    },
  });
  const [advancing, setAdvancing] = useState(false);
  const [downloadingUnity, setDownloadingUnity] = useState(false);
  const [heightMeters, setHeightMeters] = useState('1.70');
  const [orientationConfirmed, setOrientationConfirmed] = useState(false);
  const [jointNotes, setJointNotes] = useState('');
  const [selectedScreen, setSelectedScreen] = useState<'shape' | 'rigging' | 'animation' | 'unity' | null>(null);
  const advance = async (stage: 'blender' | 'rigging_animation', rerig = false) => {
    setAdvancing(true);
    try { await api.post(`/api/3d-studio/projects/${projectId}/advance`, stage === 'rigging_animation' ? { stage, heightMeters: Number(heightMeters), orientationConfirmed, jointNotes, rerig } : { stage }); if (rerig) setSelectedScreen('rigging'); await q.refetch(); }
    catch (error) { toast({ title: '리깅 요청 실패', description: errMsg(error), variant: 'destructive' }); }
    finally { setAdvancing(false); }
  };
  const downloadUnityPackage = async () => {
    setDownloadingUnity(true);
    try {
      const response = await fetch(`/api/3d-studio/projects/${projectId}/unity-package?format=json`);
      if (!response.ok) {
        const error = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(error?.error || `다운로드 실패 (${response.status})`);
      }
      const { downloadUrl } = await response.json() as { downloadUrl?: string };
      if (!downloadUrl) throw new Error('ZIP 다운로드 주소를 받지 못했습니다.');
      const link = document.createElement('a');
      link.href = downloadUrl;
      document.body.append(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({ title: 'Unity 파일 다운로드 실패', description: errMsg(error), variant: 'destructive' });
    } finally {
      setDownloadingUnity(false);
    }
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
  const stage = (id: 'trellis' | 'rigging_animation' | 'blender' | 'animation' | 'unity_bundle') => project.workflowStages?.find((item) => item.id === id);
  const shapeReady = stage('trellis')?.status === 'completed';
  const rigReady = stage('rigging_animation')?.status === 'completed';
  const animationReady = stage('animation')?.status === 'completed';
  const suggestedScreen = stage('rigging_animation')?.status === 'running' ? 'rigging' : animationReady ? 'unity' : rigReady ? 'animation' : 'shape';
  const screen = selectedScreen ?? suggestedScreen;
  const screenStages: Record<typeof screen, Array<'trellis' | 'rigging_animation' | 'blender' | 'animation' | 'unity_bundle'>> = {
    shape: ['trellis'], rigging: ['rigging_animation', 'blender'], animation: ['animation'], unity: ['unity_bundle'],
  };

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
        <Badge variant={animationReady ? 'default' : project.status === 'failed' ? 'destructive' : 'secondary'}>{animationReady ? '애니메이션 완료' : project.status === 'failed' ? '생성 실패' : shapeReady ? rigReady ? '리깅 완료 · 애니메이션 대기' : '3D 형상 완료 · 리깅 대기' : '3D 형상 생성 중'}</Badge>
      </div>

      {isWorking && (
        <Card className="mb-6 flex items-center gap-3 p-4">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-sm font-medium">{project.status === 'generating' ? '3D 생성 워커 준비·대기 중입니다. 첫 실행은 모델 로딩에 시간이 걸립니다.' : stage('rigging_animation')?.status === 'running' ? '캐릭터의 뼈대와 스킨 웨이트를 생성하고 FBX를 검증 중입니다.' : stage('animation')?.status === 'running' ? '선택한 동작을 적용하고 애니메이션 파일을 검증 중입니다.' : '이미지를 3D 모델로 변환하고 있습니다. 완료되면 뷰어가 표시됩니다.'}</span>
        </Card>
      )}

      {project.status === 'failed' && (
        <Card className="mb-6 border-destructive/30 bg-destructive/[.04] p-5">
          <p className="font-semibold text-destructive">3D 에셋 생성에 실패했습니다</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.error || 'Blender 워커가 작업을 완료하지 못했습니다. 참조 이미지를 확인한 뒤 새 작업으로 다시 시도해주세요.'}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onBack}><RotateCcw className="size-3.5" /> 새 에셋으로 다시 만들기</Button>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="3D 제작 화면">
        {([
          ['shape', '1. 3D 형상', true],
          ['rigging', '2. 리깅', shapeReady],
          ['animation', '3. 애니메이션', rigReady],
          ['unity', '4. Unity 파일', animationReady],
        ] as const).map(([id, label, enabled]) => <Button key={id} type="button" variant={screen === id ? 'default' : 'outline'} disabled={!enabled} onClick={() => setSelectedScreen(id)}>{label}</Button>)}
      </div>

      {project.workflowStages?.length ? (
        <Card className="mb-6 p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">3D 제작 단계</h2><p className="mt-1 text-sm text-muted-foreground">{project.workflowMode === 'guided' ? '중간 결과를 확인하고 직접 다음 단계로 진행합니다.' : '각 단계가 성공하면 자동으로 다음 단계로 이어집니다.'}</p></div><Badge variant="outline">{project.workflowMode === 'guided' ? '단계 확인' : '자동 완주'}</Badge></div>
          <div className="space-y-3">
            {project.workflowStages.filter((item) => screenStages[screen].includes(item.id)).map((stage) => <div key={stage.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{stage.title}</p><Badge variant={stage.status === 'completed' ? 'default' : stage.status === 'failed' ? 'destructive' : 'secondary'}>{stage.status === 'completed' ? '완료' : stage.status === 'running' ? '진행 중' : stage.status === 'awaiting_approval' ? '다음 단계 대기' : stage.status === 'failed' ? '실패' : '대기'}</Badge></div>
              <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p>
              {stage.error && <p className="mt-2 text-sm text-destructive">{stage.error}</p>}
              {stage.id === 'trellis' && (project.generationPreview ? <div className="mt-3"><GenerationPreview previewUrl={project.generationPreview.url} finalGlbUrl={stage.previewGlbUrl} /></div>
                : stage.previewGlbUrl && <div className="mx-auto mt-3 w-full max-w-[560px] rounded-lg bg-muted"><ModelPreview src={stage.previewGlbUrl} /></div>)}
              {stage.id === 'rigging_animation' && stage.status === 'completed' && stage.previewGlbUrl && <div className="mx-auto mt-3 w-full max-w-[560px] rounded-lg bg-muted"><ModelPreview src={stage.previewGlbUrl} /></div>}
              {stage.id === 'blender' && stage.status === 'awaiting_approval' && (project.workflowMode === 'guided' || Boolean(stage.error)) && <Button className="mt-3" size="sm" onClick={() => void advance('blender')} disabled={advancing}><Play className="size-3.5" /> {advancing ? 'Blender 준비 요청 중…' : '이 3D 결과로 Blender 준비 진행'}</Button>}
              {stage.id === 'rigging_animation' && stage.status === 'awaiting_approval' && <div className="mt-3 space-y-3 rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">캐릭터의 크기와 방향을 확인하세요. 뼈대와 웨이트를 자동 생성한 뒤 FBX로 변환합니다. 아래 메모는 기록용이며 관절을 수정하지는 않습니다. 관절 직접 편집과 동작 클립 연결은 아직 지원하지 않습니다.</p><div className="grid gap-2 sm:grid-cols-2"><Label className="text-xs">캐릭터 키(m)<input className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" type="number" min="0.5" max="3" step="0.01" value={heightMeters} onChange={(event) => setHeightMeters(event.target.value)} /></Label><Label className="flex items-end gap-2 pb-1 text-xs"><input type="checkbox" checked={orientationConfirmed} onChange={(event) => setOrientationConfirmed(event.target.checked)} /> 얼굴이 +Z 전방을 향함</Label></div><textarea value={jointNotes} onChange={(event) => setJointNotes(event.target.value)} placeholder="수동 보정 메모: 예) 팔이 몸통에 붙어 있음, 발 위치를 넓혀야 함" className="min-h-16 w-full rounded-md border bg-background p-2 text-sm" /><Button size="sm" onClick={() => void advance('rigging_animation')} disabled={advancing || !orientationConfirmed}><Play className="size-3.5" /> {advancing ? '리깅 요청 중…' : 'SkinTokens 자동 리깅 요청'}</Button></div>}
              {stage.id === 'rigging_animation' && stage.status === 'completed' && <div className="mt-3 space-y-2"><p className="text-xs text-muted-foreground">새 리깅이 성공하면 기존 동작은 새 뼈대에 다시 적용해야 합니다. 실패하면 현재 파일은 유지됩니다.</p><Button variant="outline" size="sm" onClick={() => void advance('rigging_animation', true)} disabled={advancing || isWorking}><RotateCcw className="size-3.5" /> {advancing ? '리깅 요청 중…' : '자동 리깅 다시 하기'}</Button></div>}
            </div>)}
          </div>
          {screen === 'shape' && shapeReady && <Button className="mt-4" onClick={() => setSelectedScreen('rigging')}>리깅 화면으로 진행 <ChevronRight className="size-4" /></Button>}
          {screen === 'rigging' && rigReady && <Button className="mt-4" onClick={() => setSelectedScreen('animation')}>애니메이션 화면으로 진행 <ChevronRight className="size-4" /></Button>}
          {screen === 'animation' && animationReady && <Button className="mt-4" onClick={() => setSelectedScreen('unity')}>Unity 파일 화면으로 진행 <ChevronRight className="size-4" /></Button>}
        </Card>
      ) : null}

      {/* Display the generated mesh, not the input thumbnail. */}
      {project.generationTiming?.executionTimeMs !== undefined && (
        <p className="mb-4 text-sm text-muted-foreground">3D 생성 처리 {Math.round(project.generationTiming.executionTimeMs / 1000)}초 · 워커 대기 {Math.round((project.generationTiming.delayTimeMs ?? 0) / 1000)}초</p>
      )}
      {screen === 'animation' && rigReady && <MotionLibrary projectId={projectId} riggedGlbUrl={outputs[0]?.riggedGlbUrl} onContinue={() => setSelectedScreen('unity')} />}
      {(screen === 'shape' || screen === 'unity') && outputs.length > 0 && (
        <div className="space-y-4">
          {outputs.map((output) => (
            <Card key={output.id} className="overflow-hidden">
              <div className="mx-auto flex aspect-square w-full max-w-[560px] items-center justify-center bg-muted">
                {output.riggedGlbUrl || output.glbUrl ? <ModelPreview src={(screen === 'unity' ? stage('animation')?.previewGlbUrl ?? Object.entries(output.animationUrls ?? {}).find(([name]) => name.endsWith('.glb'))?.[1] : undefined) ?? output.riggedGlbUrl ?? output.glbUrl} /> : output.thumbnailUrl ? (
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
                  {screen === 'unity' && animationReady && <Button size="sm" onClick={() => void downloadUnityPackage()} disabled={downloadingUnity}>{downloadingUnity ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />} {downloadingUnity ? 'Unity 파일 준비 중…' : 'Unity 개발 파일 ZIP'}</Button>}
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
                {output.animationUrls && Object.keys(output.animationUrls).length > 0 && <div><p className="mb-2 text-sm font-medium">추가한 애니메이션</p><div className="flex flex-wrap gap-2">{Object.entries(output.animationUrls).map(([name, url]) => <Button key={name} variant="outline" size="sm" asChild><a href={url} download target="_blank" rel="noreferrer"><Download className="size-3" /> {output.animationNames?.[name.split('.')[0]] ?? name.split('.')[0]} ({name.split('.').at(-1)?.toUpperCase()})</a></Button>)}</div></div>}
                {screen === 'unity' && animationReady && <p className="text-xs text-muted-foreground">ZIP의 FBX 파일은 Unity Assets 폴더에 넣을 수 있습니다. Rig 탭에서 Generic으로 설정하고 클립을 확인하세요. Humanoid Avatar와 머티리얼은 Unity에서 별도 검증이 필요합니다.</p>}
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
