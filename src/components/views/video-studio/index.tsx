'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Box, CheckCircle2, ChevronDown, Clapperboard, Clock3,
  Download, ExternalLink, Film, FolderOpen, ImagePlus, Layers3, Loader2, MapPinned, Music2, PackageOpen,
  Play, Plus, Share2, Sparkles, Upload, UsersRound, Wand2,
} from 'lucide-react';
import { api, ApiError, uploadFile } from '@/lib/api-client';
import { encodeHash, useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { ArtifactDTO } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type StudioMode = 'gallery' | 'quick' | 'workspace';
type GalleryTab = 'video' | 'asset' | 'projects';
type InputMode = 'text' | 'image';

interface StudioMetadata {
  prompt?: string;
  style?: string;
  targetDurationSec?: number;
  inputMode?: string;
  inputImageUrl?: string | null;
  aspectRatio?: string;
  quality?: string;
  projectStatus?: string;
  render?: { engine?: string; runpodJobId?: string; status?: string; videoUrl?: string | null; queuedAt?: string };
  shots?: Array<{ id: string; index: number; title: string; prompt: string; duration: number; inputMode: string; status: string }>;
}

interface FeaturedCard {
  id: string;
  title: string;
  creator: string;
  subtitle: string;
  kind: 'video' | 'asset';
  duration?: string;
  model?: string;
  gradient: string;
  tags: string[];
}

const featuredVideos: FeaturedCard[] = [
  { id: 'sunrise', title: '새벽의 섬을 지나', creator: 'JIN', subtitle: '여행 필름 · 9:16', kind: 'video', duration: '00:08', model: 'H3', gradient: 'from-slate-950 via-sky-900 to-amber-300', tags: ['여행', '시네마틱'] },
  { id: 'cafe', title: '비 오는 날의 카페', creator: 'minseo', subtitle: '브랜드 무드 필름', kind: 'video', duration: '00:06', model: 'Wan', gradient: 'from-stone-900 via-amber-800 to-orange-300', tags: ['카페', '무드'] },
  { id: 'product', title: '한 방울의 이야기', creator: 'NOVA', subtitle: '제품 광고 · 16:9', kind: 'video', duration: '00:07', model: 'LTX', gradient: 'from-zinc-950 via-fuchsia-900 to-pink-300', tags: ['제품', '광고'] },
  { id: 'night', title: '도시가 잠들기 전', creator: 'yoons', subtitle: '나레이션 숏폼', kind: 'video', duration: '00:10', model: 'H3', gradient: 'from-slate-950 via-indigo-900 to-cyan-300', tags: ['도시', '내레이션'] },
];

const featuredAssets: FeaturedCard[] = [
  { id: 'character', title: '수현 · 캐릭터 바이블', creator: 'JIN', subtitle: '캐릭터 · 8개 참조 프레임', kind: 'asset', gradient: 'from-rose-950 via-rose-700 to-orange-200', tags: ['캐릭터', '리믹스 가능'] },
  { id: 'place', title: '제주 해안의 아침', creator: 'seogwipo', subtitle: '장소 · 스타일 레퍼런스', kind: 'asset', gradient: 'from-cyan-950 via-teal-700 to-emerald-200', tags: ['장소', '제주'] },
  { id: 'prop', title: '프리미엄 티 세트', creator: 'bloom', subtitle: '제품 · 3D 렌더 베이스', kind: 'asset', gradient: 'from-yellow-950 via-amber-700 to-yellow-100', tags: ['제품', 'Blender'] },
  { id: 'style', title: '90s 필름 그레인', creator: 'filmclub', subtitle: '스타일 · 컬러 바이블', kind: 'asset', gradient: 'from-violet-950 via-purple-700 to-fuchsia-200', tags: ['스타일', '필름'] },
];

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '요청을 완료하지 못했습니다.';
}

function asStudioMetadata(artifact: ArtifactDTO): StudioMetadata {
  return artifact.metadata as unknown as StudioMetadata;
}

export default function VideoStudioView() {
  const session = useAppStore((s) => s.session);
  const params = useAppStore((s) => s.params);
  const navigate = useAppStore((s) => s.navigate);
  const mode: StudioMode = params.studio === 'quick' ? 'quick' : params.studio === 'workspace' ? 'workspace' : 'gallery';
  const selectedProjectId = mode === 'workspace' ? params.project ?? null : null;
  const remix = params.remix ? [...featuredVideos, ...featuredAssets].find((card) => card.id === params.remix) ?? null : null;

  // A direct link or a pre-fix tab may not have an in-app history entry behind
  // it. Add Gallery as that entry so the browser Back button and the visible
  // "갤러리로 돌아가기" action always land on the same screen.
  useEffect(() => {
    if (mode === 'gallery' || typeof window === 'undefined' || history.state?.playlab) return;
    const current = window.location.hash;
    history.replaceState({ playlab: true }, '', encodeHash('video-studio'));
    history.pushState({ playlab: true }, '', current);
  }, [mode]);

  const returnToGallery = () => {
    if (typeof window !== 'undefined' && mode !== 'gallery') {
      window.history.back();
      return;
    }
    navigate('video-studio');
  };

  const openQuick = (card?: FeaturedCard) => {
    navigate('video-studio', { studio: 'quick', ...(card ? { remix: card.id } : {}) });
  };

  if (mode === 'quick') return <QuickStart onBack={returnToGallery} onCreated={(id) => navigate('video-studio', { studio: 'workspace', project: id })} remix={remix} />;
  if (mode === 'workspace' && selectedProjectId) return <ProjectWorkspace projectId={selectedProjectId} onBack={returnToGallery} />;
  return <StudioGallery session={Boolean(session)} onNewProject={() => openQuick()} onRemix={openQuick} onOpenProject={(id) => navigate('video-studio', { studio: 'workspace', project: id })} />;
}

function StudioGallery({ session, onNewProject, onRemix, onOpenProject }: {
  session: boolean; onNewProject: () => void; onRemix: (card: FeaturedCard) => void; onOpenProject: (id: string) => void;
}) {
  const [tab, setTab] = useState<GalleryTab>('video');
  const [search, setSearch] = useState('');
  const publicVideos = useQuery({
    queryKey: ['video-studio-gallery'],
    queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=feed&type=video&moduleId=video-studio&limit=12'),
  });
  const projects = useQuery({
    queryKey: ['video-studio-projects'], queryFn: () => api.get<ArtifactDTO[]>('/api/video-studio/projects'), enabled: session,
  });
  const activeCards = tab === 'asset' ? featuredAssets : featuredVideos;
  const filtered = activeCards.filter((card) => `${card.title} ${card.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 pb-10">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 px-6 py-9 text-white shadow-xl sm:px-10">
        <div className="absolute -right-20 -top-24 size-80 rounded-full bg-primary/25 blur-3xl" /><div className="absolute -bottom-36 left-1/3 size-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl"><div className="mb-3 flex items-center gap-2 text-sm font-medium text-sky-200"><Sparkles className="size-4" /> PLAYLAB VIDEO STUDIO</div><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">보고, 바로 만들고,<br />이야기로 완성하세요.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">크리에이터의 영상과 에셋에서 시작해, 프롬프트 한 줄 또는 이미지 한 장으로 첫 샷을 만드세요.</p></div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row"><Button className="bg-white text-slate-950 hover:bg-slate-100" onClick={onNewProject}><Plus className="size-4" /> 새 프로젝트</Button><Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setTab('asset')}><PackageOpen className="size-4" /> 에셋 둘러보기</Button></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">{[['01', '가장 빠른 시작', '이미지 한 장 또는 프롬프트 한 줄'], ['02', '샷을 이어 만들기', '첫·끝 프레임과 바이블로 연속성 유지'], ['03', '타임라인으로 완성', '자막·나레이션·BGM까지 한 프로젝트에서']].map(([number, title, description]) => <div key={number} className="rounded-2xl border bg-card p-4"><span className="text-xs font-bold text-primary">{number}</span><h2 className="mt-1 font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>)}</section>

      <section className="rounded-3xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-1 rounded-xl bg-muted p-1">{([['video', 'Video Studio'], ['asset', 'Asset Studio'], ['projects', '내 프로젝트']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', tab === value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>{label}</button>)}</div>{tab !== 'projects' && <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="스타일, 장면, 에셋 검색" className="w-full sm:w-56" />}{tab === 'projects' && <Button size="sm" onClick={onNewProject}><Plus className="size-4" /> 새 프로젝트</Button>}</div>
        {tab === 'projects' ? <ProjectShelf session={session} projects={projects.data ?? []} loading={projects.isLoading} onNewProject={onNewProject} onOpenProject={onOpenProject} /> : <><div className="mt-5 flex items-center justify-between"><div><h2 className="font-semibold">{tab === 'video' ? '지금 영감을 주는 영상' : '영상의 기준이 되는 에셋'}</h2><p className="mt-1 text-sm text-muted-foreground">좋아하는 결과를 선택해 그 스타일과 문맥으로 새 프로젝트를 시작하세요.</p></div><Badge variant="secondary">공개 갤러리</Badge></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{filtered.map((card) => <FeaturedTile key={card.id} card={card} onRemix={() => onRemix(card)} />)}{tab === 'video' && publicVideos.data?.slice(0, 4).map((video) => <ArtifactTile key={video.id} artifact={video} onRemix={onNewProject} />)}</div></>}
      </section>
    </div>
  );
}

function FeaturedTile({ card, onRemix }: { card: FeaturedCard; onRemix: () => void }) {
  return <article className="group overflow-hidden rounded-2xl border bg-background"><div className={cn('relative aspect-[4/5] overflow-hidden bg-gradient-to-br', card.gradient)}><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(255,255,255,.35),transparent_24%),linear-gradient(145deg,transparent_30%,rgba(0,0,0,.55))]" /><div className="absolute inset-x-3 top-3 flex items-center justify-between"><Badge className="border-0 bg-black/40 text-white hover:bg-black/40">{card.kind === 'video' ? <Film className="mr-1 size-3" /> : <Box className="mr-1 size-3" />}{card.kind === 'video' ? '영상' : '에셋'}</Badge>{card.duration && <span className="rounded-md bg-black/40 px-2 py-1 text-xs text-white">{card.duration}</span>}</div><div className="absolute inset-x-3 bottom-3"><p className="font-semibold text-white">{card.title}</p><p className="mt-1 text-xs text-white/75">by {card.creator}</p></div></div><div className="space-y-3 p-3"><p className="text-xs text-muted-foreground">{card.subtitle}</p><div className="flex flex-wrap gap-1">{card.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div><Button variant="outline" size="sm" className="w-full" onClick={onRemix}><Wand2 className="size-3.5" /> 이 문맥으로 만들기</Button></div></article>;
}

function ArtifactTile({ artifact, onRemix }: { artifact: ArtifactDTO; onRemix: () => void }) {
  return <article className="overflow-hidden rounded-2xl border bg-background"><div className="relative aspect-[4/5] bg-gradient-to-br from-primary/30 via-violet-500/30 to-slate-900">{artifact.fileUrl ? <img src={artifact.fileUrl} alt="" className="size-full object-cover" /> : <Film className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-white/80" />}<Badge className="absolute left-3 top-3 border-0 bg-black/40 text-white hover:bg-black/40">커뮤니티</Badge></div><div className="space-y-2 p-3"><p className="truncate font-medium">{artifact.title}</p><p className="text-xs text-muted-foreground">by {artifact.owner.username}</p><Button variant="outline" size="sm" className="w-full" onClick={onRemix}>이 영상에서 시작</Button></div></article>;
}

function ProjectShelf({ session, projects, loading, onNewProject, onOpenProject }: { session: boolean; projects: ArtifactDTO[]; loading: boolean; onNewProject: () => void; onOpenProject: (id: string) => void }) {
  if (!session) return <EmptyShelf title="내 프로젝트를 이어서 작업하세요" description="로그인하면 생성한 영상, 에셋, 바이블을 프로젝트 단위로 안전하게 보관합니다." action="로그인하고 시작" />;
  if (loading) return <div className="grid grid-cols-3 gap-4 py-6">{[1, 2, 3].map((key) => <div key={key} className="h-48 animate-pulse rounded-2xl bg-muted" />)}</div>;
  if (!projects.length) return <EmptyShelf title="아직 영상 프로젝트가 없습니다" description="프롬프트 한 줄이나 이미지 한 장으로 첫 샷을 바로 시작해보세요." action="첫 영상 만들기" onAction={onNewProject} />;
  return <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{projects.map((project) => { const meta = asStudioMetadata(project); return <button key={project.id} type="button" onClick={() => onOpenProject(project.id)} className="group rounded-2xl border p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/[.03]"><div className="flex items-start justify-between"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Clapperboard className="size-5" /></span><Badge variant="outline">편집 중</Badge></div><h3 className="mt-5 line-clamp-2 font-semibold">{project.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{meta.prompt ?? project.description}</p><div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground"><span>{meta.targetDurationSec ?? 6}초</span><span>{meta.aspectRatio ?? '9:16'}</span><span>{meta.shots?.length ?? 1} 샷</span></div></button>; })}</div>;
}

function EmptyShelf({ title, description, action, onAction }: { title: string; description: string; action: string; onAction?: () => void }) {
  return <div className="my-6 flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center"><FolderOpen className="size-8 text-muted-foreground" /><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p><Button className="mt-5" onClick={onAction ?? (() => useAppStore.getState().setLoginOpen(true))}>{action}</Button></div>;
}

function QuickStart({ onBack, onCreated, remix }: { onBack: () => void; onCreated: (id: string) => void; remix: FeaturedCard | null }) {
  const session = useAppStore((s) => s.session);
  const { toast } = useToast();
  const [inputMode, setInputMode] = useState<InputMode>(remix?.kind === 'asset' ? 'image' : 'text');
  const [prompt, setPrompt] = useState(remix ? `${remix.title}의 분위기와 ${remix.tags.join(', ')} 스타일을 참고해 새로운 장면을 만듭니다.` : '');
  const [aspect, setAspect] = useState('9:16'); const [duration, setDuration] = useState('6'); const [quality, setQuality] = useState('draft');
  // The API currently routes the first shot through the verified H3 path.
  // Keep this local value for the upcoming multi-engine UI without allowing it
  // to change the server-side route before the dedicated worker is verified.
  const [engine, setEngine] = useState<'h3' | 'wan' | 'ltx'>('h3');
  const [showAdvanced, setShowAdvanced] = useState(false); const [imageUrl, setImageUrl] = useState<string | null>(null); const [uploading, setUploading] = useState(false); const [submitting, setSubmitting] = useState(false); const inputRef = useRef<HTMLInputElement>(null);

  const pickImage = async (file?: File) => { if (!file) return; if (!session) { useAppStore.getState().setLoginOpen(true); return; } setUploading(true); try { const result = await uploadFile(file); setImageUrl(result.url); setInputMode('image'); } catch (error) { toast({ title: '이미지 업로드 실패', description: errorMessage(error), variant: 'destructive' }); } finally { setUploading(false); } };
  const create = async () => { if (!session) { useAppStore.getState().setLoginOpen(true); return; } if (prompt.trim().length < 3) { toast({ title: '장면 설명을 입력해주세요', description: '3자 이상 입력하면 첫 샷을 만들 수 있습니다.', variant: 'destructive' }); return; } if (inputMode === 'image' && !imageUrl) { toast({ title: '시작 이미지를 업로드해주세요', description: '이미지 한 장을 올리면 해당 장면을 움직이는 영상으로 만들 수 있습니다.', variant: 'destructive' }); return; } setSubmitting(true); try { const project = await api.post<ArtifactDTO>('/api/video-studio/projects', { prompt, inputMode, inputImageUrl: imageUrl, targetDurationSec: Number(duration), aspectRatio: aspect, quality, engine, style: remix?.tags.join(', ') ?? 'cinematic' }); const result = await api.post<{ engine: string }>(`/api/video-studio/projects/${project.id}/render`, { shotId: 'shot-1', engine }); toast({ title: '첫 샷을 렌더 큐에 넣었습니다', description: `${inputMode === 'image' ? '시작 이미지를 반영해' : '프롬프트를 바탕으로'} ${result.engine.toUpperCase()} 워커가 영상 생성을 시작합니다.` }); onCreated(project.id); } catch (error) { toast({ title: '프로젝트 또는 렌더 요청을 만들지 못했습니다', description: errorMessage(error), variant: 'destructive' }); } finally { setSubmitting(false); } };

  return <div className="mx-auto w-full max-w-5xl pb-10"><button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> 갤러리로 돌아가기</button><div className="overflow-hidden rounded-3xl border bg-card shadow-sm"><div className="border-b bg-gradient-to-r from-primary/[.08] via-transparent to-violet-500/[.08] px-6 py-7 sm:px-9"><Badge className="bg-primary/10 text-primary hover:bg-primary/10">새 프로젝트</Badge><h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">첫 샷부터 바로 만들어보세요.</h1><p className="mt-2 text-sm text-muted-foreground">프로젝트 이름과 긴 스토리보드는 나중에 정리하면 됩니다. 지금은 장면 하나면 충분합니다.</p></div><div className="p-5 sm:p-9"><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setInputMode('text')} className={cn('flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors', inputMode === 'text' ? 'border-primary bg-primary/[.05]' : 'hover:bg-muted/50')}><Wand2 className="mt-0.5 size-5 text-primary" /><span><strong className="block text-sm">프롬프트로 영상 만들기</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">상상한 장면을 설명하면 첫 영상을 만듭니다.</span></span></button><button type="button" onClick={() => setInputMode('image')} className={cn('flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors', inputMode === 'image' ? 'border-primary bg-primary/[.05]' : 'hover:bg-muted/50')}><ImagePlus className="mt-0.5 size-5 text-primary" /><span><strong className="block text-sm">이미지로 영상 만들기</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">한 장의 이미지를 장면의 첫 프레임으로 씁니다.</span></span></button></div><div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]"><div className="space-y-4">{inputMode === 'image' && <div className="relative overflow-hidden rounded-2xl border border-dashed bg-muted/30"><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void pickImage(event.target.files?.[0])} />{imageUrl ? <div className="relative aspect-video"><img src={imageUrl} alt="업로드한 시작 이미지" className="size-full object-cover" /><Button type="button" size="sm" variant="secondary" className="absolute bottom-3 right-3" onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> 이미지 바꾸기</Button></div> : <button type="button" className="flex min-h-52 w-full flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/60" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="size-7 animate-spin" /> : <Upload className="size-7" />}<span className="font-medium">이미지 한 장을 올려주세요</span><span className="text-xs">PNG, JPG, WebP · 최대 5MB</span></button>}</div>}<Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={inputMode === 'image' ? 4 : 8} placeholder={inputMode === 'image' ? '이 이미지에서 어떤 움직임과 장면이 이어지나요?' : '예: 비가 막 그친 제주의 해안도로. 카메라는 천천히 뒤로 이동하고, 창문에 비친 노을이 흔들린다.'} className="resize-none rounded-2xl border-muted bg-muted/[.25] p-4 leading-6" /><div className="flex flex-wrap gap-2">{['시네마틱', '광고 필름', '감성 숏폼', '카메라 무빙 강조'].map((preset) => <button key={preset} type="button" className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary" onClick={() => setPrompt((current) => current ? `${current}\n${preset}` : preset)}>{preset}</button>)}</div></div><aside className="rounded-2xl border bg-muted/[.2] p-4"><p className="text-sm font-semibold">첫 샷 설정</p><div className="mt-4 space-y-4"><QuickSelect label="길이" value={duration} values={['6', '8', '15']} suffix="초" onChange={setDuration} /><QuickSelect label="비율" value={aspect} values={['9:16', '16:9', '1:1']} onChange={setAspect} /><QuickSelect label="품질" value={quality} values={['draft', 'standard']} labels={{ draft: '빠른 초안', standard: '고품질' }} onChange={setQuality} /></div><button type="button" className="mt-5 flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowAdvanced(!showAdvanced)}>고급 설정 <ChevronDown className={cn('size-4 transition-transform', showAdvanced && 'rotate-180')} /></button>{showAdvanced && <div className="mt-3 space-y-2 rounded-xl border bg-background p-3 text-xs"><p className="font-medium">렌더 전략</p><p className="leading-5 text-muted-foreground">초안은 빠른 모델로 후보를 만들고, 선택한 샷만 고품질 렌더로 올립니다.</p><QuickSelect label="엔진" value={engine} values={['h3', 'wan', 'ltx']} labels={{ h3: 'H3 (기본)', wan: 'Wan 2.5B', ltx: 'LTX 2B' }} onChange={(v) => setEngine(v as 'h3' | 'wan' | 'ltx')} /></div>}</aside></div><div className="mt-7 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground">생성 후에는 첫·끝 프레임, 레퍼런스, 자막, 타임라인을 프로젝트 작업실에서 이어서 편집할 수 있습니다.</p><Button size="lg" onClick={() => void create()} disabled={submitting || uploading}>{submitting ? <Loader2 className="animate-spin" /> : <Play className="size-4" />} 첫 샷 만들기 <ArrowRight className="size-4" /></Button></div></div></div></div>;
}

function QuickSelect({ label, value, values, labels, suffix, onChange }: { label: string; value: string; values: string[]; labels?: Record<string, string>; suffix?: string; onChange: (value: string) => void }) {
  return <div><p className="mb-2 text-xs text-muted-foreground">{label}</p><div className="flex flex-wrap gap-1">{values.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={cn('rounded-lg border px-2.5 py-1.5 text-xs transition-colors', value === option ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:border-primary/50')}>{labels?.[option] ?? `${option}${suffix ?? ''}`}</button>)}</div></div>;
}

function ProjectWorkspace({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const { toast } = useToast();
  const projectQuery = useQuery({ queryKey: ['video-studio-project', projectId], queryFn: () => api.get<ArtifactDTO>(`/api/video-studio/projects/${projectId}`) });
  const renderJobId = projectQuery.data ? asStudioMetadata(projectQuery.data).render?.runpodJobId : undefined;
  const renderStatusQuery = useQuery({
    queryKey: ['video-studio-render-status', projectId, renderJobId],
    queryFn: () => api.get<{ status: string; executionTime?: number; error?: string; videoUrl?: string | null }>(`/api/video-studio/projects/${projectId}/render/status`),
    enabled: Boolean(renderJobId),
    refetchInterval: (query) => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(query.state.data?.status ?? '') ? false : 5000,
  });
  if (projectQuery.isLoading) return <div className="mx-auto flex min-h-80 max-w-7xl items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  if (projectQuery.isError || !projectQuery.data) return <div className="mx-auto max-w-xl rounded-2xl border p-8 text-center"><p className="font-semibold">프로젝트를 불러오지 못했습니다.</p><p className="mt-2 text-sm text-muted-foreground">{errorMessage(projectQuery.error)}</p><Button className="mt-5" variant="outline" onClick={onBack}>갤러리로 돌아가기</Button></div>;
  const project = projectQuery.data; const meta = asStudioMetadata(project); const shots = meta.shots ?? []; const hasStartImage = Boolean(meta.inputImageUrl);
  const renderStatus = renderStatusQuery.data?.status ?? meta.render?.status ?? 'QUEUED';
  const renderError = renderStatusQuery.data?.error;
  const renderVideoUrl = renderStatusQuery.data?.videoUrl ?? meta.render?.videoUrl ?? project.fileUrl ?? null;
  const rendering = ['IN_QUEUE', 'IN_PROGRESS', 'QUEUED', 'RUNNING'].includes(renderStatus);
  const rerender = async () => {
    try {
      const result = await api.post<{ engine: string }>(`/api/video-studio/projects/${projectId}/render`, { shotId: 'shot-1' });
      await projectQuery.refetch();
      await renderStatusQuery.refetch();
      toast({ title: '렌더 큐에 넣었습니다', description: `${result.engine.toUpperCase()} 워커가 첫 샷을 처리합니다.` });
    } catch (error) {
      toast({ title: '렌더 요청 실패', description: errorMessage(error), variant: 'destructive' });
    }
  };
  const wsEngineLabel = (meta.render?.engine ?? 'H3').toUpperCase();
  const renderLabel = renderStatus === 'COMPLETED' ? '렌더 완료' : renderStatus === 'FAILED' || renderStatus === 'CANCELLED' ? '렌더 실패' : renderStatus === 'IN_PROGRESS' || renderStatus === 'RUNNING' ? `${wsEngineLabel}에서 렌더 중` : '렌더 큐 대기 중';
  const renderDescription = renderError ?? (renderStatus === 'COMPLETED'
    ? '첫 샷이 완성되었습니다. 결과를 확인하고 다음 샷의 기준 프레임으로 사용할 수 있습니다.'
    : renderStatus === 'FAILED' || renderStatus === 'CANCELLED'
      ? '작업이 완료되지 않았습니다. 다시 렌더해보세요.'
      : 'Runpod 워커가 첫 샷을 처리하고 있습니다. 이 화면에서 상태가 자동으로 갱신됩니다.');

  if (rendering) {
    return <FirstShotGenerationScreen project={project} meta={meta} renderStatus={renderStatus} onBack={onBack} />;
  }

  if (project.id) {
    return (
      <div className="mx-auto w-full max-w-[1500px] pb-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> 갤러리
          </button>
          <span className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground">Video Studio</span>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{project.title}</h1>
          <Badge variant="secondary">{shots.length} shot</Badge>
          {renderVideoUrl && renderStatus === 'COMPLETED' && <>
            <Button variant="outline" size="sm" onClick={async () => { try { const res = await fetch(renderVideoUrl); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `playlab-${project.title.replace(/\s+/g, '-')}.mp4`; a.click(); URL.revokeObjectURL(url); } catch { window.open(renderVideoUrl, '_blank'); } }}>
              <Download className="size-4" /> 다운로드
            </Button>
            <Button variant="outline" size="sm" onClick={async () => { try { await api.patch(`/api/artifacts/${project.id}`, { visibility: 'public', status: 'published' }); await projectQuery.refetch(); toast({ title: '게시 완료', description: '영상이 공개 갤러리에 게시되었습니다.' }); } catch (error) { toast({ title: '게시 실패', description: errorMessage(error), variant: 'destructive' }); } }}>
              <Share2 className="size-4" /> 게시하기
            </Button>
          </>}
          <Button size="sm" onClick={() => void rerender()} disabled={rendering}>
            {rendering ? <Loader2 className="size-4 animate-spin" /> : <Clapperboard className="size-4" />}
            {rendering ? '렌더 중' : renderStatus === 'COMPLETED' ? '다시 렌더' : '렌더하기'}
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_300px]">
          <aside className="rounded-2xl border bg-card p-4 xl:min-h-[720px]">
            <div className="flex items-center justify-between"><div><p className="font-semibold">에셋 · 바이블</p><p className="mt-1 text-xs text-muted-foreground">이 프로젝트의 기준점</p></div><Button variant="ghost" size="icon" className="size-8"><Plus className="size-4" /></Button></div>
            <BibleGroup icon={<UsersRound className="size-4" />} title="캐릭터" items={['아직 등록한 캐릭터가 없습니다']} />
            <BibleGroup icon={<MapPinned className="size-4" />} title="장소" items={['씬 1 · 첫 장면']} />
            <BibleGroup icon={<PackageOpen className="size-4" />} title="소품 · 제품" items={['에셋을 추가해 일관성을 유지하세요']} />
            <BibleGroup icon={<Sparkles className="size-4" />} title="스타일" items={[meta.style ?? 'cinematic']} />
            <BibleGroup icon={<Music2 className="size-4" />} title="오디오" items={['BGM · 나레이션 · 효과음']} />
          </aside>

          <main className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><Badge variant="secondary">씬 1</Badge><h2 className="mt-2 text-lg font-semibold">첫 장면</h2><p className="mt-1 text-sm text-muted-foreground">첫 샷을 확정한 다음, 장면을 이어가세요.</p></div><div className="flex gap-2"><Button variant="outline" size="sm"><Layers3 className="size-4" /> 타임라인</Button><Button variant="outline" size="sm"><Plus className="size-4" /> 샷 추가</Button></div></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ShotCanvasCard title="샷 1" prompt={meta.prompt ?? project.description} duration={meta.targetDurationSec ?? 6} imageUrl={meta.inputImageUrl ?? null} videoUrl={renderVideoUrl} rendering={rendering} status={renderLabel} aspectRatio={meta.aspectRatio ?? '9:16'} selected />
              <button type="button" className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed text-muted-foreground transition-colors hover:border-primary hover:bg-primary/[.03]"><Plus className="size-7" /><span className="mt-3 font-medium">다음 샷 추가</span><span className="mt-1 text-xs">앞 샷의 마지막 프레임을 이어갈 수 있어요</span></button>
            </div>
            <div className={cn('mt-4 rounded-2xl border p-4', renderStatus === 'FAILED' || renderStatus === 'CANCELLED' ? 'border-destructive/30 bg-destructive/[.06]' : renderStatus === 'COMPLETED' ? 'border-emerald-500/30 bg-emerald-500/[.08]' : 'border-primary/20 bg-primary/[.05]')}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {rendering ? <Loader2 className="size-4 animate-spin text-primary" /> : renderStatus === 'COMPLETED' ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Clapperboard className="size-4 text-destructive" />}
                {renderLabel}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{renderDescription}</p>
            </div>
            <div className="mt-6 rounded-2xl border bg-muted/[.25] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /><p className="text-sm font-medium">타임라인</p></div><span className="text-xs text-muted-foreground">00:00 · 00:{String(meta.targetDurationSec ?? 6).padStart(2, '0')}</span></div><div className="mt-4 flex gap-2"><div className="w-16 pt-2 text-xs text-muted-foreground">Video</div><div className="h-12 flex-1 rounded-lg bg-gradient-to-r from-primary/70 via-violet-500/70 to-sky-500/70 p-2 text-xs text-white">첫 샷 · {meta.targetDurationSec ?? 6}초</div></div><div className="mt-2 flex gap-2"><div className="w-16 pt-2 text-xs text-muted-foreground">Subtitle</div><div className="h-8 flex-1 rounded-lg border border-dashed bg-background" /></div></div>
          </main>

          <aside className="rounded-2xl border bg-card p-4 xl:min-h-[720px]"><p className="font-semibold">샷 인스펙터</p><div className="mt-4 overflow-hidden rounded-xl bg-slate-900"><div className={cn('relative', meta.aspectRatio === '9:16' ? 'aspect-[9/16]' : meta.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video')}>{hasStartImage ? <img src={meta.inputImageUrl ?? ''} alt="첫 프레임" className="size-full object-cover" /> : <div className="size-full bg-[radial-gradient(circle_at_65%_30%,rgba(250,204,21,.35),transparent_24%),linear-gradient(135deg,#172554,#0f172a_55%,#7c2d12)]" />}<span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-1 text-[10px] text-white">{meta.aspectRatio ?? '9:16'}</span><Play className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-white" /></div></div><InspectorRow label="생성 방식" value={meta.inputMode === 'image' ? '이미지 → 영상' : '프롬프트 → 영상'} /><InspectorRow label="엔진" value={wsEngineLabel} /><InspectorRow label="길이" value={`${meta.targetDurationSec ?? 6}초`} /><InspectorRow label="비율" value={meta.aspectRatio ?? '9:16'} /><div className="mt-5"><p className="text-xs font-medium text-muted-foreground">장면 프롬프트</p><p className="mt-2 rounded-xl border bg-muted/[.25] p-3 text-sm leading-6">{meta.prompt ?? project.description}</p></div>{renderVideoUrl && renderStatus === 'COMPLETED' && <div className="mt-5 space-y-2"><Button variant="outline" size="sm" className="w-full" onClick={async () => { try { const res = await fetch(renderVideoUrl); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `playlab-${project.title.replace(/\s+/g, '-')}.mp4`; a.click(); URL.revokeObjectURL(url); } catch { window.open(renderVideoUrl, '_blank'); } }}><Download className="size-4" /> 영상 다운로드</Button><Button variant="outline" size="sm" className="w-full" onClick={() => { void navigator.clipboard.writeText(renderVideoUrl); toast({ title: '링크 복사 완료', description: '영상 URL이 클립보드에 복사되었습니다.' }); }}><ExternalLink className="size-4" /> 링크 복사</Button></div>}</aside>
        </div>
      </div>
    );
  }
  return <div className="mx-auto w-full max-w-[1500px] pb-8"><div className="mb-4 flex flex-wrap items-center gap-3"><button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> 갤러리</button><span className="h-4 w-px bg-border" /><span className="text-sm text-muted-foreground">Video Studio</span><h1 className="min-w-0 flex-1 truncate text-lg font-bold">{project.title}</h1><Badge variant="secondary">{shots.length} shot</Badge><Button variant="outline" size="sm">저장</Button><Button size="sm" onClick={() => toast({ title: '렌더 큐 준비 중', description: '첫 샷의 Runpod 렌더 요청 연결을 다음 단계로 진행합니다.' })}><Clapperboard className="size-4" /> 렌더하기</Button></div><div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_300px]"><aside className="rounded-2xl border bg-card p-4 xl:min-h-[720px]"><div className="flex items-center justify-between"><div><p className="font-semibold">에셋 · 바이블</p><p className="mt-1 text-xs text-muted-foreground">이 프로젝트의 기준점</p></div><Button variant="ghost" size="icon" className="size-8"><Plus className="size-4" /></Button></div><BibleGroup icon={<UsersRound className="size-4" />} title="캐릭터" items={['아직 등록한 캐릭터가 없습니다']} /><BibleGroup icon={<MapPinned className="size-4" />} title="장소" items={['씬 1 · 첫 장면']} /><BibleGroup icon={<PackageOpen className="size-4" />} title="소품 · 제품" items={['에셋을 추가해 일관성을 유지하세요']} /><BibleGroup icon={<Sparkles className="size-4" />} title="스타일" items={[meta.style ?? 'cinematic']} /><BibleGroup icon={<Music2 className="size-4" />} title="오디오" items={['BGM · 나레이션 · 효과음']} /></aside><main className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><Badge variant="secondary">씬 1</Badge><h2 className="mt-2 text-lg font-semibold">첫 장면</h2><p className="mt-1 text-sm text-muted-foreground">첫 샷을 확정한 다음, 장면을 이어가세요.</p></div><div className="flex gap-2"><Button variant="outline" size="sm"><Layers3 className="size-4" /> 타임라인</Button><Button variant="outline" size="sm"><Plus className="size-4" /> 샷 추가</Button></div></div><div className="mt-6 grid gap-4 md:grid-cols-2"><ShotCanvasCard title="샷 1" prompt={meta.prompt ?? project.description} duration={meta.targetDurationSec ?? 6} imageUrl={meta.inputImageUrl ?? null} aspectRatio={meta.aspectRatio ?? '9:16'} selected /><button type="button" className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed text-muted-foreground transition-colors hover:border-primary hover:bg-primary/[.03]"><Plus className="size-7" /><span className="mt-3 font-medium">다음 샷 추가</span><span className="mt-1 text-xs">앞 샷의 마지막 프레임을 이어갈 수 있어요</span></button></div><div className="mt-6 rounded-2xl border bg-muted/[.25] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /><p className="text-sm font-medium">타임라인</p></div><span className="text-xs text-muted-foreground">00:00 · 00:{String(meta.targetDurationSec ?? 6).padStart(2, '0')}</span></div><div className="mt-4 flex gap-2"><div className="w-16 pt-2 text-xs text-muted-foreground">Video</div><div className="h-12 flex-1 rounded-lg bg-gradient-to-r from-primary/70 via-violet-500/70 to-sky-500/70 p-2 text-xs text-white">첫 샷 · {meta.targetDurationSec ?? 6}초</div></div><div className="mt-2 flex gap-2"><div className="w-16 pt-2 text-xs text-muted-foreground">Subtitle</div><div className="h-8 flex-1 rounded-lg border border-dashed bg-background" /></div></div></main><aside className="rounded-2xl border bg-card p-4 xl:min-h-[720px]"><p className="font-semibold">샷 인스펙터</p><div className="mt-4 overflow-hidden rounded-xl bg-slate-900"><div className={cn('relative', meta.aspectRatio === '9:16' ? 'aspect-[9/16]' : meta.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video')}>{hasStartImage ? <img src={meta.inputImageUrl ?? ''} alt="첫 프레임" className="size-full object-cover" /> : <div className="size-full bg-[radial-gradient(circle_at_65%_30%,rgba(250,204,21,.35),transparent_24%),linear-gradient(135deg,#172554,#0f172a_55%,#7c2d12)]" />}<span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-1 text-[10px] text-white">{meta.aspectRatio ?? '9:16'}</span><Play className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-white" /></div></div><InspectorRow label="생성 방식" value={meta.inputMode === 'image' ? '이미지 → 영상' : '프롬프트 → 영상'} /><InspectorRow label="길이" value={`${meta.targetDurationSec ?? 6}초`} /><InspectorRow label="비율" value={meta.aspectRatio ?? '9:16'} /><div className="mt-5"><p className="text-xs font-medium text-muted-foreground">장면 프롬프트</p><p className="mt-2 rounded-xl border bg-muted/[.25] p-3 text-sm leading-6">{meta.prompt ?? project.description}</p></div><div className="mt-5 rounded-xl border bg-emerald-500/[.12] p-3"><div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" /> 다음 단계</div><p className="mt-1 text-xs leading-5 text-muted-foreground">첫 샷을 렌더한 뒤, 결과를 다음 장면의 첫 프레임 또는 참조 에셋으로 사용하세요.</p></div></aside></div></div>;
}

function FirstShotGenerationScreen({ project, meta, renderStatus, onBack }: { project: ArtifactDTO; meta: StudioMetadata; renderStatus: string; onBack: () => void }) {
  const waiting = renderStatus === 'QUEUED' || renderStatus === 'IN_QUEUE';
  const source = meta.inputImageUrl;
  const engineLabel = (meta.render?.engine ?? 'H3').toUpperCase();
  const aspect = meta.aspectRatio ?? '9:16';
  const isLandscape = aspect === '16:9';
  const isSquare = aspect === '1:1';
  const aspectClass = isLandscape ? 'aspect-video' : isSquare ? 'aspect-square' : 'aspect-[9/16]';
  const running = renderStatus === 'IN_PROGRESS' || renderStatus === 'RUNNING';
  const progressPercent = waiting ? 20 : running ? 65 : 10;
  const stages = [
    { label: '시작 이미지 · 프롬프트 접수', detail: '프로젝트에 저장됨', done: true },
    { label: waiting ? `${engineLabel} 렌더 워커 대기` : `${engineLabel}에서 움직임 생성 중`, detail: waiting ? 'GPU가 작업을 시작하면 자동으로 다음 단계로 넘어갑니다.' : '첫 프레임을 바탕으로 영상을 만들고 있습니다.', done: false, active: true },
    { label: '영상 패키징 · 작업실 반영', detail: '완료되면 바로 재생 가능한 첫 샷이 됩니다.', done: false },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-11rem)] w-full max-w-5xl items-center justify-center pb-10">
      <section className="w-full overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="border-b bg-gradient-to-r from-primary/[.1] via-violet-500/[.07] to-sky-500/[.1] px-6 py-5 sm:px-8">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> 갤러리로 돌아가기</button>
        </div>
        <div className={cn('grid gap-8 p-6 sm:p-10', isLandscape ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center')}>
          <div>
            <Badge className="border-0 bg-primary/10 text-primary hover:bg-primary/10"><Loader2 className="mr-1 size-3 animate-spin" /> {waiting ? '렌더 큐 대기 중' : `${engineLabel} 렌더 중`}</Badge>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">첫 샷을 영상으로 만들고 있습니다.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">이 화면은 자동으로 갱신됩니다. 결과가 준비되면 별도 버튼 없이 첫 샷이 영상 플레이어로 바뀝니다.</p>
            <div className="mt-7 overflow-hidden rounded-full bg-muted p-1"><div className={cn('h-2 rounded-full bg-gradient-to-r from-primary via-violet-500 to-sky-400 transition-all duration-1000', running && 'animate-pulse')} style={{ width: `${progressPercent}%` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">{waiting ? 'GPU 워커 배정 대기 중...' : running ? '영상을 생성하고 있습니다...' : '준비 중...'}</p>
            <div className="mt-6 space-y-3">
              {stages.map((stage, index) => <div key={stage.label} className={cn('flex gap-3 rounded-xl border p-3', stage.done ? 'border-emerald-500/20 bg-emerald-500/[.06]' : index === 1 ? 'border-primary/30 bg-primary/[.05]' : 'bg-muted/[.2]')}>
                <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]', stage.done ? 'bg-emerald-500 text-white' : index === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{stage.done ? '✓' : index + 1}</span>
                <div><p className="text-sm font-medium">{stage.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{stage.detail}</p></div>
              </div>)}
            </div>
          </div>
          <div className={cn('relative overflow-hidden rounded-2xl bg-slate-950 shadow-xl', isLandscape && 'mx-auto w-full max-w-2xl')}>
            <div className={cn(aspectClass, isLandscape ? '' : 'max-h-[440px]', 'bg-[radial-gradient(circle_at_65%_30%,rgba(124,58,237,.45),transparent_24%),linear-gradient(150deg,#0f172a,#1e1b4b_55%,#172554)]')}>{source && <img src={source} alt="영상으로 변환 중인 시작 이미지" className="size-full object-cover opacity-75" />}<div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" /></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white"><span className="flex size-16 items-center justify-center rounded-full bg-white/15 backdrop-blur"><Loader2 className="size-8 animate-spin" /></span><strong className="mt-4">{engineLabel}가 첫 샷을 생성 중입니다</strong><span className="mt-1 px-6 text-xs text-white/70">{meta.targetDurationSec ?? 6}초 · {aspect} · {project.title}</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BibleGroup({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return <section className="mt-6"><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">{icon}{title}</div><div className="mt-2 space-y-2">{items.map((item) => <div key={item} className="rounded-lg bg-muted/60 px-2.5 py-2 text-xs">{item}</div>)}</div></section>;
}

function ShotCanvasCard({ title, prompt, duration, imageUrl, videoUrl, rendering, status = '생성 준비됨', selected, aspectRatio = '16:9' }: { title: string; prompt: string; duration: number; imageUrl?: string | null; videoUrl?: string | null; rendering?: boolean; status?: string; selected?: boolean; aspectRatio?: string }) {
  const cardAspect = aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video';
  const downloadVideo = async () => {
    if (!videoUrl) return;
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `playlab-${title.replace(/\s+/g, '-')}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(videoUrl, '_blank');
    }
  };
  if (videoUrl || rendering) {
    return <article className={cn('overflow-hidden rounded-2xl border bg-background transition-colors', selected && 'border-primary ring-2 ring-primary/15')}><div className={cn('relative bg-slate-900', cardAspect)}>{videoUrl ? <video src={videoUrl} controls playsInline className="size-full object-cover" /> : imageUrl ? <img src={imageUrl} alt="샷 기준 이미지" className="size-full object-cover" /> : <div className="size-full bg-[radial-gradient(circle_at_68%_22%,rgba(253,230,138,.38),transparent_18%),linear-gradient(145deg,#1e293b,#0f172a_55%,#7c2d12)]" />}{rendering && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/65 text-center text-white"><Loader2 className="size-7 animate-spin" /><strong className="mt-3 text-sm">첫 샷을 영상으로 만드는 중</strong><span className="mt-1 px-5 text-xs text-white/75">완료되면 이 자리에서 바로 재생됩니다.</span></div>}<Badge className="absolute left-3 top-3 border-0 bg-black/45 text-white hover:bg-black/45">{title}</Badge><span className="absolute bottom-3 right-3 rounded-md bg-black/45 px-2 py-1 text-xs text-white">00:0{duration}</span></div><div className="p-3"><p className="line-clamp-2 text-sm font-medium">{prompt}</p><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><Badge variant="secondary">초안</Badge><span className="text-xs text-muted-foreground">{status}</span></div>{videoUrl && !rendering && <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={downloadVideo}><Download className="size-3.5" /> 다운로드</Button>}</div></div></article>;
  }
  return <article className={cn('overflow-hidden rounded-2xl border bg-background transition-colors', selected && 'border-primary ring-2 ring-primary/15')}><div className={cn('relative bg-slate-900', cardAspect)}>{imageUrl ? <img src={imageUrl} alt="샷 기준 이미지" className="size-full object-cover" /> : <div className="size-full bg-[radial-gradient(circle_at_68%_22%,rgba(253,230,138,.38),transparent_18%),linear-gradient(145deg,#1e293b,#0f172a_55%,#7c2d12)]" />}<Badge className="absolute left-3 top-3 border-0 bg-black/45 text-white hover:bg-black/45">{title}</Badge><span className="absolute bottom-3 right-3 rounded-md bg-black/45 px-2 py-1 text-xs text-white">00:0{duration}</span></div><div className="p-3"><p className="line-clamp-2 text-sm font-medium">{prompt}</p><div className="mt-3 flex items-center gap-2"><Badge variant="secondary">초안</Badge><span className="text-xs text-muted-foreground">{status}</span></div></div></article>;
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return <div className="mt-4 flex items-center justify-between border-b pb-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
