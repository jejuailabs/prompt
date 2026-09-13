'use client';

// SPA view router — the ONLY navigation layer (single visible page route).
// Views map 1:1 to ModuleConfig.entryView registered in the module registry.
import { useAppStore } from '@/lib/store';
import HomeView from '@/components/views/home';
import GalleryView from '@/components/views/gallery';
import PromptDetailView from '@/components/views/prompt';
import PromptWikiView from '@/components/views/prompt-wiki';
import ProjectDetailView from '@/components/views/project';
import ModelLabView from '@/components/views/lab';
import PipelinesView from '@/components/views/pipelines';
import { PipelineRunView } from '@/components/views/pipelines/run';
import SmokeTestView from '@/components/views/smoke';
import RevenueView from '@/components/views/revenue';
import MarketplaceView from '@/components/views/market';
import CommunityView from '@/components/views/community';
import AcademyView from '@/components/views/academy';
import AiToolsView from '@/components/views/ai-tools';
import MyProjectsView from '@/components/views/my-projects';
import GameRoomView from '@/components/views/game-room';
import GamePlayView from '@/components/views/game-room/play';
import VideoStudioView from '@/components/views/video-studio';
import Studio3dView from '@/components/views/3d-studio';
import AdminView from '@/components/views/admin';
import ToolView from '@/components/views/tool';

export default function ViewRouter() {
  const view = useAppStore((s) => s.view);
  const params = useAppStore((s) => s.params);

  // Key by view+params.id so detail views remount cleanly when target changes
  switch (view) {
    case 'home':
      return <HomeView />;
    case 'gallery':
      return <GalleryView key={params.q ?? ''} />;
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
