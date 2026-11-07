import type { ModuleConfigSeed } from '@/lib/registry/module-configs';

export const GITHUB_PICK_MODULE: ModuleConfigSeed = {
  id: 'github-pick', phase: 1, titleKo: '깃허브 픽', titleEn: 'GitHub Picks',
  descKo: '유튜버들이 소개한 화제의 깃허브 도구를 매일 쉬운 말로 정리해요', descEn: 'Trending GitHub tools from YouTube, explained daily',
  icon: 'git-branch', navOrder: 7.16, enabled: true, status: 'new',
  mainScreenSlot: 'none', entryView: 'github-pick', requiresAuth: false, adminOnly: false,
  group: 'learn', newUntilDays: 30,
};
