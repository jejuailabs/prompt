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
import MyProjectsView from '@/components/views/my-projects';
import AdminView from '@/components/views/admin';

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
    case 'my-projects':
      return <MyProjectsView />;
    case 'admin':
      return <AdminView />;
    default:
      return <HomeView />;
  }
}
