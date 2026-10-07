import type { ModuleConfigSeed } from '@/lib/registry/module-configs';
export const AI_EVENTS_MODULE: ModuleConfigSeed = {
  id: 'ai-events', phase: 1, titleKo: 'AI 일정', titleEn: 'AI Events',
  descKo: 'AI 강의·공모전·행사를 포스터로 둘러보세요', descEn: 'Discover AI courses, competitions and events',
  icon: 'calendar-days', navOrder: 7.2, enabled: true, status: 'active',
  mainScreenSlot: 'none', entryView: 'ai-events', requiresAuth: false, adminOnly: false,
  group: 'learn',
  primaryNav: { label: 'AI 일정', order: 6 },
};
