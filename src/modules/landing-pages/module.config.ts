import type { ModuleConfigSeed } from "@/lib/registry/module-configs";
export const LANDING_PAGES_MODULE: ModuleConfigSeed = {
  id: "landing-pages",
  phase: 1,
  titleKo: "랜딩페이지",
  titleEn: "Landing Pages",
  descKo: "ZIP으로 보관하고 실제 페이지로 미리보기",
  descEn: "Save static ZIP packages and preview real pages",
  icon: "globe",
  navOrder: 7.3,
  enabled: true,
  status: "active",
  mainScreenSlot: "none",
  entryView: "landing-pages",
  requiresAuth: true,
  adminOnly: false,
  group: "studio",
  primaryNav: { label: "랜딩페이지", order: 7 },
};
