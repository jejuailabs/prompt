import type { ModuleConfigSeed } from '@/lib/registry/module-configs';

export const AI_GUIDE_MODULE: ModuleConfigSeed = {
  id: 'ai-guide', phase: 1, titleKo: 'AI 서비스 가이드', titleEn: 'AI Service Guide',
  descKo: '선반에서 골라 보는 AI 서비스 사용설명서', descEn: 'Pick an AI service from the shelf and get started',
  icon: 'compass', navOrder: 7.05, enabled: true, status: 'active',
  mainScreenSlot: 'none', entryView: 'ai-guide', requiresAuth: false, adminOnly: false,
  group: 'learn',
};
