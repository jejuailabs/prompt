import type { ModuleConfigSeed } from '@/lib/registry/module-configs';
export const MOTION_LIBRARY_MODULE: ModuleConfigSeed = {
  id: 'motion-library', phase: 1, titleKo: '모션 라이브러리', titleEn: 'Motion Library',
  descKo: 'Remotion 모션그래픽 예제 44가지를 둘러보고 원본 코드로 이동하세요', descEn: 'Browse 44 Remotion motion graphics references',
  icon: 'clapperboard', navOrder: 7.4, enabled: true, status: 'new',
  mainScreenSlot: 'none', entryView: 'motion-library', requiresAuth: false, adminOnly: false,
  group: 'learn', newUntilDays: 30,
  primaryNav: { label: '모션', order: 8 },
};
