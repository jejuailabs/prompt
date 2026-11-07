// COAI menu slots (docs/coai/02-information-architecture.md).
// 2026-11-08 사용자 지시: 프롬프트·만들어보기·바로쓰기·가이드·배우기 다섯 메뉴를 COAI 정의
// "같이 배우고 · 같이 쓰고 · 같이 만들기"에 맞춰 배우기·써보기·만들기 세 메뉴로 묶었다 (8개 → 6개).
// 묶인 화면은 각 메뉴의 하위 탭(COAI_SECTIONS)으로 모두 남는다. 새 모듈은 view 이름만 여기 매핑한다.
import type { ViewKey } from './types';

export type CoaiMenuId = 'home' | 'news' | 'learn' | 'use' | 'make' | 'community';

export type CoaiMenu = {
  id: CoaiMenuId;
  /** i18n key in the `coai` namespace */
  labelKey: string;
  /** lucide icon name used by the mobile bottom tab */
  icon: 'home' | 'newspaper' | 'sparkles' | 'play-square' | 'book-open' | 'users';
  /** Screen opened by the menu */
  target: { view: ViewKey; params?: Record<string, string> };
  /** Screens that keep this menu highlighted */
  views: ViewKey[];
};

export const COAI_MENUS: CoaiMenu[] = [
  { id: 'home', labelKey: 'navHome', icon: 'home', target: { view: 'home' }, views: ['home'] },
  { id: 'news', labelKey: 'navNews', icon: 'newspaper', target: { view: 'news' }, views: ['news', 'ai-events', 'github-pick'] },
  // 배우기 = AI 서비스 사용설명서(가이드) + 영상 강의. Beginners land on the guide shelf first.
  { id: 'learn', labelKey: 'navLearn', icon: 'book-open', target: { view: 'ai-guide' }, views: ['ai-guide', 'vibe-setup', 'academy'] },
  // 써보기 = 프롬프트 갤러리(+ 진화 트리) + 바로 쓰는 AI 도구.
  { id: 'use', labelKey: 'navUse', icon: 'sparkles', target: { view: 'gallery', params: { tab: 'prompts' } }, views: ['prompt-wiki', 'prompt', 'ai-tools', 'tool'] },
  { id: 'make', labelKey: 'navMake', icon: 'play-square', target: { view: 'game-room' }, views: ['game-room', 'game-play', 'landing-pages', 'motion-library', 'project', 'lab', 'video-studio', '3d-studio'] },
  { id: 'community', labelKey: 'navCommunity', icon: 'users', target: { view: 'community' }, views: ['community', 'gallery'] },
];

/** Mobile bottom tab bar: five fixed slots — every menu except 소식, which stays in the header/drawer. */
export const COAI_BOTTOM_TABS: CoaiMenuId[] = ['home', 'learn', 'use', 'make', 'community'];

export function activeCoaiMenu(view: ViewKey, params?: Record<string, string>): CoaiMenuId | null {
  // One gallery view serves two menus: its prompts tab belongs to 써보기, its works tab to 커뮤니티.
  if (view === 'gallery' && params?.tab === 'prompts') return 'use';
  // ACE-Step music is a tool screen but lives under 만들기 › 음악.
  if (view === 'tool' && params?.slug === 'ace-music') return 'make';
  return COAI_MENUS.find((menu) => menu.views.includes(view))?.id ?? null;
}

export function coaiMenuHref(menu: CoaiMenu) {
  if (menu.target.view === 'home') return '/';
  const query = menu.target.params ? `?${new URLSearchParams(menu.target.params)}` : '';
  return `/app#${menu.target.view}${query}`;
}

export type CoaiSection = {
  id: string; label: string; labelEn: string;
  target: { view: ViewKey; params?: Record<string, string> };
  /** True when this tab is the current screen. */
  current: (view: ViewKey, params: Record<string, string>) => boolean;
};

const onViews = (...views: ViewKey[]) => (view: ViewKey) => views.includes(view);

/** Sub-section tabs shown under a grouped menu, so merged screens stay one click away. */
export const COAI_SECTIONS: Partial<Record<CoaiMenuId, CoaiSection[]>> = {
  learn: [
    { id: 'guide', label: 'AI 가이드', labelEn: 'AI Guides', target: { view: 'ai-guide' }, current: onViews('ai-guide') },
    { id: 'start', label: '바이브코딩 시작', labelEn: 'Start vibe-coding', target: { view: 'vibe-setup' }, current: onViews('vibe-setup') },
    { id: 'courses', label: '강의', labelEn: 'Courses', target: { view: 'academy' }, current: onViews('academy') },
  ],
  use: [
    { id: 'prompts', label: '프롬프트', labelEn: 'Prompts', target: { view: 'gallery', params: { tab: 'prompts' } }, current: (view, params) => view === 'prompt' || view === 'prompt-wiki' || (view === 'gallery' && params.tab === 'prompts') },
    { id: 'tools', label: 'AI 도구', labelEn: 'AI Tools', target: { view: 'ai-tools' }, current: (view, params) => view === 'ai-tools' || (view === 'tool' && params.slug !== 'ace-music') },
  ],
  make: [
    { id: 'games', label: '게임', labelEn: 'Games', target: { view: 'game-room' }, current: onViews('game-room', 'game-play') },
    { id: 'web', label: '웹·랜딩', labelEn: 'Web', target: { view: 'landing-pages' }, current: onViews('landing-pages') },
    { id: 'motion', label: '모션', labelEn: 'Motion', target: { view: 'motion-library' }, current: onViews('motion-library') },
    { id: 'image', label: '이미지 생성', labelEn: 'Image', target: { view: 'lab' }, current: onViews('lab') },
    { id: 'video', label: '영상 생성', labelEn: 'Video', target: { view: 'video-studio' }, current: onViews('video-studio') },
    { id: '3d', label: '3D 생성', labelEn: '3D', target: { view: '3d-studio' }, current: onViews('3d-studio') },
    { id: 'music', label: '음악 생성', labelEn: 'Music', target: { view: 'tool', params: { slug: 'ace-music' } }, current: (view, params) => view === 'tool' && params.slug === 'ace-music' },
  ],
};
