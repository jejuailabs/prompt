// COAI menu slots (docs/coai/02-information-architecture.md).
// The eight menus are the fixed IA; modules are mapped onto a slot here so a
// newly registered module only needs to name its view, not edit the header.
import type { ViewKey } from './types';

export type CoaiMenuId = 'home' | 'news' | 'prompts' | 'make' | 'tools' | 'guide' | 'learn' | 'community';

export type CoaiMenu = {
  id: CoaiMenuId;
  /** i18n key in the `coai` namespace */
  labelKey: string;
  /** lucide icon name used by the mobile bottom tab */
  icon: 'home' | 'newspaper' | 'sparkles' | 'play-square' | 'wrench' | 'compass' | 'book-open' | 'users';
  /** Screen opened by the menu */
  target: { view: ViewKey; params?: Record<string, string> };
  /** Screens that keep this menu highlighted */
  views: ViewKey[];
};

export const COAI_MENUS: CoaiMenu[] = [
  { id: 'home', labelKey: 'navHome', icon: 'home', target: { view: 'home' }, views: ['home'] },
  { id: 'news', labelKey: 'navNews', icon: 'newspaper', target: { view: 'news' }, views: ['news', 'ai-events'] },
  { id: 'prompts', labelKey: 'navPrompts', icon: 'sparkles', target: { view: 'prompt-wiki' }, views: ['prompt-wiki', 'prompt'] },
  { id: 'make', labelKey: 'navMake', icon: 'play-square', target: { view: 'game-room' }, views: ['game-room', 'game-play', 'landing-pages', 'motion-library', 'project', 'lab', 'video-studio', '3d-studio'] },
  { id: 'tools', labelKey: 'navTools', icon: 'wrench', target: { view: 'ai-tools' }, views: ['ai-tools', 'tool'] },
  // Until the guide menu ships (S3) it opens the existing vibe-coding starter guide.
  { id: 'guide', labelKey: 'navGuide', icon: 'compass', target: { view: 'vibe-setup' }, views: ['vibe-setup'] },
  { id: 'learn', labelKey: 'navLearn', icon: 'book-open', target: { view: 'academy' }, views: ['academy'] },
  { id: 'community', labelKey: 'navCommunity', icon: 'users', target: { view: 'community' }, views: ['community', 'gallery'] },
];

/** Mobile bottom tab bar: five fixed slots (docs/coai/02 §2). */
export const COAI_BOTTOM_TABS: CoaiMenuId[] = ['home', 'learn', 'prompts', 'make', 'community'];

export function activeCoaiMenu(view: ViewKey): CoaiMenuId | null {
  return COAI_MENUS.find((menu) => menu.views.includes(view))?.id ?? null;
}

export function coaiMenuHref(menu: CoaiMenu) {
  if (menu.target.view === 'home') return '/';
  const query = menu.target.params ? `?${new URLSearchParams(menu.target.params)}` : '';
  return `/app#${menu.target.view}${query}`;
}

/** Sub-sections shown as tabs on every 만들어보기 screen (one place for games, web, motion and creative studios). */
export const COAI_MAKE_SECTIONS: { id: string; label: string; labelEn: string; target: { view: ViewKey; params?: Record<string, string> }; views: ViewKey[] }[] = [
  { id: 'games', label: '게임', labelEn: 'Games', target: { view: 'game-room' }, views: ['game-room', 'game-play'] },
  { id: 'web', label: '웹·랜딩', labelEn: 'Web', target: { view: 'landing-pages' }, views: ['landing-pages'] },
  { id: 'motion', label: '모션', labelEn: 'Motion', target: { view: 'motion-library' }, views: ['motion-library'] },
  { id: 'image', label: '이미지 생성', labelEn: 'Image', target: { view: 'lab' }, views: ['lab'] },
  { id: 'video', label: '영상 생성', labelEn: 'Video', target: { view: 'video-studio' }, views: ['video-studio'] },
  { id: '3d', label: '3D 생성', labelEn: '3D', target: { view: '3d-studio' }, views: ['3d-studio'] },
  { id: 'music', label: '음악 생성', labelEn: 'Music', target: { view: 'tool', params: { slug: 'ace-music' } }, views: [] },
];

/** 뉴스·이벤트 tabs (docs/coai/04 §2: 뉴스 | 행사·모임). */
export const COAI_NEWS_SECTIONS: typeof COAI_MAKE_SECTIONS = [
  { id: 'news', label: '뉴스', labelEn: 'News', target: { view: 'news' }, views: ['news'] },
  { id: 'events', label: '행사·모임', labelEn: 'Events', target: { view: 'ai-events' }, views: ['ai-events'] },
];
