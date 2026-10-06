'use client';

// SPA view router — the ONLY navigation layer (single visible page route).
// Views map 1:1 to ModuleConfig.entryView registered in the module registry.
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import HomeView from '@/components/views/home';
import { useRuntime } from '@/components/runtime-context';
import { Button } from '@/components/ui/button';
const GalleryView = dynamic(() => import('@/components/views/gallery'), { loading: () => <ViewLoading /> });
const PromptDetailView = dynamic(() => import('@/components/views/prompt'), { loading: () => <ViewLoading /> });
const PromptWikiView = dynamic(() => import('@/components/views/prompt-wiki'), { loading: () => <ViewLoading /> });
const ProjectDetailView = dynamic(() => import('@/components/views/project'), { loading: () => <ViewLoading /> });
const ModelLabView = dynamic(() => import('@/components/views/lab'), { loading: () => <ViewLoading /> });
const PipelinesView = dynamic(() => import('@/components/views/pipelines'), { loading: () => <ViewLoading /> });
const PipelineRunView = dynamic(() => import('@/components/views/pipelines/run').then(m => m.PipelineRunView), { loading: () => <ViewLoading /> });
const SmokeTestView = dynamic(() => import('@/components/views/smoke'), { loading: () => <ViewLoading /> });
const RevenueView = dynamic(() => import('@/components/views/revenue'), { loading: () => <ViewLoading /> });
const MarketplaceView = dynamic(() => import('@/components/views/market'), { loading: () => <ViewLoading /> });
const CommunityView = dynamic(() => import('@/components/views/community'), { loading: () => <ViewLoading /> });
const AcademyView = dynamic(() => import('@/components/views/academy'), { loading: () => <ViewLoading /> });
const VibeSetupView = dynamic(() => import('@/components/views/vibe-setup'), { loading: () => <ViewLoading /> });
const AiToolsView = dynamic(() => import('@/components/views/ai-tools'), { loading: () => <ViewLoading /> });
const MyProjectsView = dynamic(() => import('@/components/views/my-projects'), { loading: () => <ViewLoading /> });
const GameRoomView = dynamic(() => import('@/components/views/game-room'), { loading: () => <ViewLoading /> });
const GamePlayView = dynamic(() => import('@/components/views/game-room/play'), { loading: () => <ViewLoading /> });
const VideoStudioView = dynamic(() => import('@/components/views/video-studio'), { loading: () => <ViewLoading /> });
const Studio3dView = dynamic(() => import('@/components/views/3d-studio'), { loading: () => <ViewLoading /> });
const AdminView = dynamic(() => import('@/components/views/admin'), { loading: () => <ViewLoading /> });
const ToolView = dynamic(() => import('@/components/views/tool'), { loading: () => <ViewLoading /> });

function ViewLoading() { return <div className="editorial-page" role="status"><div className="h-12 w-52 animate-pulse bg-muted" /><div className="mt-8 h-80 animate-pulse bg-muted" /><span className="sr-only">화면 불러오는 중</span></div>; }

export default function ViewRouter() {
  const view = useAppStore((s) => s.view);
  const params = useAppStore((s) => s.params);
  const navigate = useAppStore((s) => s.navigate);
  const { previewMode } = useRuntime();
  const unavailable: Record<string, string> = { pipelines: '파이프라인', 'pipeline-run': '파이프라인 실행', smoke: '스모크 테스트', market: '마켓플레이스', admin: '관리자' };
  if (previewMode && unavailable[view]) return <section className="editorial-page"><h1 className="editorial-page-title">{unavailable[view]}</h1><p className="mt-5 max-w-xl leading-7 text-muted-foreground">이 기능은 현재 미리보기에 연결되어 있지 않아요. 운영 데이터와 로그인 연결 후 확인할 수 있습니다.</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => navigate('ai-tools')}>AI Tools 둘러보기</Button><Button variant="outline" onClick={() => navigate('vibe-setup')}>바이브코딩 시작 가이드</Button></div></section>;

  // Key by view+params.id so detail views remount cleanly when target changes
  switch (view) {
    case 'home':
      return <HomeView />;
    case 'gallery':
      return <GalleryView key={[params.q, params.tab, params.type].join('-')} />;
    case 'prompt':
      return <PromptDetailView key={params.id ?? 'none'} />;
    case 'project':
      return <ProjectDetailView key={params.id ?? 'none'} />;
    case 'prompt-wiki':
      return <PromptWikiView />;
    case 'lab':
      return <ModelLabView key={`${params.promptId ?? ''}-${params.promptText ?? ''}`} />;
    case 'pipelines':
      return <PipelinesView />;
    case 'pipeline-run':
      return <PipelineRunView key={params.id ?? 'none'} />;
    case 'smoke':
      return <SmokeTestView key={params.id ?? 'list'} />;
    case 'revenue':
      return <RevenueView />;
    case 'market':
      return <MarketplaceView />;
    case 'community':
      return <CommunityView />;
    case 'academy':
      return <AcademyView />;
    case 'vibe-setup':
      return <VibeSetupView />;
    case 'ai-tools':
      return <AiToolsView />;
    case 'tool':
      return <ToolView key={params.slug ?? 'none'} />;
    case 'my-projects':
      return <MyProjectsView />;
    case 'game-room':
      return <GameRoomView />;
    case 'game-play':
      return <GamePlayView key={params.id ?? 'none'} />;
    case 'video-studio':
      return <VideoStudioView />;
    case '3d-studio':
      return <Studio3dView />;
    case 'admin':
      return <AdminView />;
    default:
      return <HomeView />;
  }
}
