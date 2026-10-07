import { MODULE_CONFIGS } from './registry/module-configs';
import { moduleDestination } from './module-navigation';
import type { ModuleDTO } from './types';

export const SPACE_SECTIONS = [
  { id: 'create', ko: '만들기 · 실험실', en: 'Create & experiment' },
  { id: 'learn', ko: '바이브코딩 · 배우기', en: 'Learn & get started' },
  { id: 'explore', ko: '둘러보기 · 커뮤니티', en: 'Explore & community' },
  { id: 'account', ko: '내 공간', en: 'Your space' },
  { id: 'upcoming', ko: '준비 중인 공간', en: 'Coming soon' },
] as const;

/** Individual utilities stay inside AI Tools; music is also a creative lab. */
export function isSpaceModule(module: ModuleDTO) {
  return module.group !== 'tools' || module.id === 'tool-ace-music';
}

export function spaceEntry(module: ModuleDTO) {
  const target = moduleDestination(module);
  const query = target.params ? `?${new URLSearchParams(target.params)}` : '';
  const href = target.view === 'home' ? '/#home' : `/app#${target.view}${query}`;
  const section = ['preparing', 'coming-soon'].includes(module.status) && ['smoke', 'market', 'revenue', 'pipeline-run'].includes(module.entryView) ? 'upcoming'
    : module.group === 'learn' || ['vibe-setup', 'academy'].includes(module.id) ? 'learn'
    : module.group === 'studio' || ['model-lab', 'tool-ace-music', 'tools-catalogue'].includes(module.id) ? 'create'
    : module.adminOnly || module.entryView === 'my-projects' ? 'account' : 'explore';
  const quick = ({
    'vibe-setup': { label: '바이브코딩', order: 0 },
    'video-studio': { label: '영상 생성', order: 1 },
    '3d-studio': { label: '3D 생성', order: 2 },
    'tool-ace-music': { label: '음악 생성', order: 3 },
    'model-lab': { label: '모델 실험실', order: 4 },
  } as Record<string, { label: string; order: number }>)[module.id];
  const legacyPrimary = ['home','prompt-wiki','gallery','game-room','academy','ai-tools'];
  const primaryLabels: Record<string,string> = {home:'홈','prompt-wiki':'프롬프트',gallery:'둘러보기','game-room':'게임',academy:'강의','ai-tools':'AI Tools'};
  const order = legacyPrimary.indexOf(module.entryView);
  const declaredPrimary = MODULE_CONFIGS.find(seed=>seed.id===module.id)?.primaryNav;
  const primary = !module.adminOnly && (declaredPrimary || !module.group) ? declaredPrimary ?? (order >= 0 ? {label:primaryLabels[module.entryView],order} : undefined) : undefined;
  return { ...module, href, section, quick, primary };
}

export function spaceEntries(modules: ModuleDTO[], admin = false) {
  return modules.filter(m => m.enabled && isSpaceModule(m) && (!m.adminOnly || admin))
    .sort((a, b) => a.navOrder - b.navOrder).map(spaceEntry);
}

export function primarySpaceEntries(modules: ModuleDTO[]) { return spaceEntries(modules).filter(entry=>entry.primary).sort((a,b)=>a.primary!.order-b.primary!.order); }
