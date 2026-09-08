// Module Registry — code-side source of truth (mirrored into `modules` table for runtime admin toggle).
// Per docs/02: new feature = register a module, never hardcode UI.
import type { ModuleDTO } from '@/lib/types';

export interface ModuleConfigSeed extends Omit<ModuleDTO, 'newUntil'> {
  newUntilDays?: number; // relative days from now, converted to ISO at seed time
}

export const MODULE_CONFIGS: ModuleConfigSeed[] = [
  {
    id: 'main-gallery', phase: 1, titleKo: '홈', titleEn: 'Home',
    descKo: '아이디어를 만들고, 실험하고, 세상에 선보이세요',
    descEn: 'Create, experiment and showcase your ideas',
    icon: 'home', navOrder: 1, enabled: true, status: 'active',
    mainScreenSlot: 'hero', entryView: 'home', requiresAuth: false, adminOnly: false,
  },
  {
    id: 'my-projects', phase: 1, titleKo: '프로젝트', titleEn: 'My Projects',
    descKo: '내 아티팩트 목록', descEn: 'My artifact list',
    icon: 'folder-kanban', navOrder: 2, enabled: true, status: 'active',
    mainScreenSlot: 'none', entryView: 'my-projects', requiresAuth: true, adminOnly: false,
  },
  {
    id: 'prompt-wiki', phase: 1, titleKo: '갤러리', titleEn: 'Gallery',
    descKo: '프롬프트 위키 전체보기', descEn: 'Browse the prompt wiki',
    icon: 'images', navOrder: 3, enabled: true, status: 'active',
    mainScreenSlot: 'none', entryView: 'gallery', requiresAuth: false, adminOnly: false,
  },
  {
    id: 'model-lab', phase: 2, titleKo: '모델 실험실', titleEn: 'Model Lab',
    descKo: '같은 프롬프트를 여러 모델에 태워 비교하세요', descEn: 'Compare one prompt across models',
    icon: 'flask-conical', navOrder: 4, enabled: true, status: 'new', newUntilDays: 14,
    mainScreenSlot: 'none', entryView: 'lab', requiresAuth: false, adminOnly: false,
  },
  {
    id: 'pipeline-hub', phase: 3, titleKo: '파이프라인', titleEn: 'Pipelines',
    descKo: 'AI 자동화 도구로 아이디어를 완성하세요', descEn: 'Finish ideas with AI automation',
    icon: 'workflow', navOrder: 5, enabled: true, status: 'beta',
    mainScreenSlot: 'none', entryView: 'pipelines', requiresAuth: false, adminOnly: false,
  },
  {
    id: 'smoke-test', phase: 4, titleKo: '스모크 테스트', titleEn: 'Smoke Test',
    descKo: '광고 검증으로 출시 성공 가능성을 확인하세요', descEn: 'Validate launch potential with ads',
    icon: 'radar', navOrder: 6, enabled: true, status: 'active',
    mainScreenSlot: 'none', entryView: 'smoke', requiresAuth: false, adminOnly: false,
  },
  {
    id: 'revenue-dashboard', phase: 4, titleKo: '수익 & 정산', titleEn: 'Revenue',
    descKo: '수익 공유 현황과 정산을 관리하세요', descEn: 'Track revenue shares & payouts',
    icon: 'wallet', navOrder: 7, enabled: true, status: 'active',
    mainScreenSlot: 'none', entryView: 'revenue', requiresAuth: true, adminOnly: false,
  },
  {
    id: 'marketplace', phase: 5, titleKo: '마켓플레이스', titleEn: 'Marketplace',
    descKo: '입점 수익공유와 개발자 매칭', descEn: 'Listings & developer matching',
    icon: 'store', navOrder: 8, enabled: true, status: 'active',
    mainScreenSlot: 'none', entryView: 'market', requiresAuth: false, adminOnly: false,
  },
  {
    id: 'community', phase: 1, titleKo: '커뮤니티', titleEn: 'Community',
    descKo: '랭킹과 활동을 확인하세요', descEn: 'Rankings and activity',
    icon: 'users', navOrder: 9, enabled: true, status: 'active',
    mainScreenSlot: 'sidebar', entryView: 'community', requiresAuth: false, adminOnly: false,
  },
  {
    id: 'academy', phase: 0, titleKo: '가이드 & 튜토리얼', titleEn: 'Academy',
    descKo: '바이브코딩 입문부터 출시까지', descEn: 'From vibe-coding to launch',
    icon: 'graduation-cap', navOrder: 10, enabled: true, status: 'active',
    mainScreenSlot: 'none', entryView: 'academy', requiresAuth: false, adminOnly: false,
  },
  {
    id: 'admin', phase: 0, titleKo: '어드민', titleEn: 'Admin',
    descKo: '모듈 스위치 보드, 심사 큐, 사용자 관리', descEn: 'Module switches, moderation, users',
    icon: 'shield', navOrder: 99, enabled: true, status: 'active',
    mainScreenSlot: 'none', entryView: 'admin', requiresAuth: true, adminOnly: true,
  },
];

export function isNewModule(m: Pick<ModuleDTO, 'status' | 'newUntil'>): boolean {
  if (m.status !== 'new' || !m.newUntil) return false;
  return new Date(m.newUntil).getTime() > Date.now();
}

export function moduleTitle(m: Pick<ModuleDTO, 'titleKo' | 'titleEn'>, locale: string): string {
  return locale === 'en' ? m.titleEn : m.titleKo;
}
