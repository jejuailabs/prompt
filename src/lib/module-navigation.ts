import { AI_STUDIO_TOOLS } from './ai-studio-tools';
import type { ModuleDTO, ViewKey } from './types';

/** One destination contract for the desktop menu, mobile menu and catalogue. */
export function moduleDestination(module: Pick<ModuleDTO, 'id' | 'entryView'>): { view: ViewKey; params?: Record<string, string> } {
  if (AI_STUDIO_TOOLS.some(tool => tool.id === module.id)) {
    return { view: 'tool', params: { slug: module.id.replace(/^tool-/, '') } };
  }
  const pipelines: Record<string, string> = { 'tool-3d': 'pipeline-3d', 'tool-shortform': 'pipeline-shortform', 'tool-detailpage': 'pipeline-detailpage', 'tool-game': 'pipeline-game' };
  if (pipelines[module.id]) return { view: 'pipeline-run', params: { id: pipelines[module.id] } };
  return { view: module.entryView as ViewKey };
}
