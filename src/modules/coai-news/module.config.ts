import type { ModuleConfigSeed } from '@/lib/registry/module-configs';

export const COAI_NEWS_MODULE: ModuleConfigSeed = {
  id: 'coai-news', phase: 1, titleKo: 'AI 뉴스', titleEn: 'AI News',
  descKo: '3줄 요약과 운영진 해설로 보는 AI 소식', descEn: 'AI news in three lines with staff commentary',
  icon: 'newspaper', navOrder: 7.15, enabled: true, status: 'active',
  mainScreenSlot: 'none', entryView: 'news', requiresAuth: false, adminOnly: false,
  group: 'learn',
};
