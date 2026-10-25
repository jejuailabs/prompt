import type { ModuleConfigSeed } from '@/lib/registry/module-configs';

export const COMMUNITY_BOARD_MODULE: ModuleConfigSeed = {
  id: 'community-board', phase: 1, titleKo: '커뮤니티', titleEn: 'Community',
  descKo: '자유·질문·학습일지·자료공유 게시판과 회원 갤러리', descEn: 'Free talk, Q&A, study logs, shared resources and member gallery',
  icon: 'users', navOrder: 7.1, enabled: true, status: 'active',
  mainScreenSlot: 'none', entryView: 'community', requiresAuth: false, adminOnly: false,
  group: 'explore',
};
