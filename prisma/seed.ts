import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding modules...');
  const modules = [
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
      id: 'prompt-wiki', phase: 1, titleKo: '프롬프트 위키', titleEn: 'Prompt Wiki',
      descKo: '프롬프트의 진화 트리를 탐색하세요', descEn: 'Explore prompt evolution trees',
      icon: 'git-fork', navOrder: 3, enabled: true, status: 'active',
      mainScreenSlot: 'none', entryView: 'prompt-wiki', requiresAuth: false, adminOnly: false,
    },
    {
      id: 'model-lab', phase: 2, titleKo: '모델 실험실', titleEn: 'Model Lab',
      descKo: '같은 프롬프트를 여러 모델에 태워 비교하세요',
      descEn: 'Compare one prompt across models',
      icon: 'flask-conical', navOrder: 4, enabled: true, status: 'active',
      mainScreenSlot: 'none', entryView: 'lab', requiresAuth: false, adminOnly: false,
    },
    // ─── Features (coming-soon) ───
    {
      id: 'smoke-test', phase: 4, titleKo: '스모크 테스트', titleEn: 'Smoke Test',
      descKo: '광고 검증으로 출시 성공 가능성을 확인하세요',
      descEn: 'Validate launch potential with ads',
      icon: 'radar', navOrder: 5, enabled: true, status: 'coming-soon',
      mainScreenSlot: 'none', entryView: 'smoke', requiresAuth: false, adminOnly: false,
    },
    {
      id: 'revenue-dashboard', phase: 4, titleKo: '수익 & 정산', titleEn: 'Revenue',
      descKo: '수익 공유 현황과 정산을 관리하세요',
      descEn: 'Track revenue shares & payouts',
      icon: 'wallet', navOrder: 6, enabled: true, status: 'coming-soon',
      mainScreenSlot: 'none', entryView: 'revenue', requiresAuth: false, adminOnly: false,
    },
    {
      id: 'marketplace', phase: 5, titleKo: '마켓플레이스', titleEn: 'Marketplace',
      descKo: '입점 수익공유와 개발자 매칭',
      descEn: 'Listings & developer matching',
      icon: 'store', navOrder: 7, enabled: true, status: 'coming-soon',
      mainScreenSlot: 'none', entryView: 'market', requiresAuth: false, adminOnly: false,
    },
    {
      id: 'community', phase: 1, titleKo: '커뮤니티', titleEn: 'Community',
      descKo: '랭킹과 활동을 확인하세요', descEn: 'Rankings and activity',
      icon: 'users', navOrder: 8, enabled: true, status: 'coming-soon',
      mainScreenSlot: 'none', entryView: 'community', requiresAuth: false, adminOnly: false,
    },
    {
      id: 'academy', phase: 0, titleKo: '가이드 & 튜토리얼', titleEn: 'Academy',
      descKo: '바이브코딩 입문부터 출시까지',
      descEn: 'From vibe-coding to launch',
      icon: 'graduation-cap', navOrder: 9, enabled: true, status: 'coming-soon',
      mainScreenSlot: 'none', entryView: 'academy', requiresAuth: false, adminOnly: false,
    },
    // ─── Tools group ───
    {
      id: 'tool-3d', phase: 3, titleKo: '3D 에셋 생성', titleEn: '3D Asset',
      descKo: '3D 에셋을 생성하세요', descEn: 'Generate 3D assets',
      icon: 'box', navOrder: 52, enabled: true, status: 'preparing',
      mainScreenSlot: 'none', entryView: 'pipeline-run', requiresAuth: false, adminOnly: false, navGroup: 'tools',
    },
    {
      id: 'tool-shortform', phase: 3, titleKo: '숏폼 영상', titleEn: 'Shortform',
      descKo: '숏폼 영상을 생성하세요', descEn: 'Generate short videos',
      icon: 'clapperboard', navOrder: 53, enabled: true, status: 'active',
      mainScreenSlot: 'none', entryView: 'pipeline-run', requiresAuth: false, adminOnly: false, navGroup: 'tools',
    },
    {
      id: 'tool-detailpage', phase: 3, titleKo: '상세페이지 제작', titleEn: 'Detail Page',
      descKo: '상세페이지를 자동 생성하세요', descEn: 'Auto-generate detail pages',
      icon: 'layout-panel-left', navOrder: 54, enabled: true, status: 'preparing',
      mainScreenSlot: 'none', entryView: 'pipeline-run', requiresAuth: false, adminOnly: false, navGroup: 'tools',
    },
    {
      id: 'tool-game', phase: 3, titleKo: '게임 만들기', titleEn: 'Make a Game',
      descKo: '게임을 만들어 보세요', descEn: 'Create a game',
      icon: 'gamepad-2', navOrder: 55, enabled: true, status: 'preparing',
      mainScreenSlot: 'none', entryView: 'pipeline-run', requiresAuth: false, adminOnly: false, navGroup: 'tools',
    },
    // ─── Admin ───
    {
      id: 'admin', phase: 0, titleKo: '어드민', titleEn: 'Admin',
      descKo: '모듈 스위치 보드, 심사 큐, 사용자 관리',
      descEn: 'Module switches, moderation, users',
      icon: 'shield', navOrder: 99, enabled: true, status: 'active',
      mainScreenSlot: 'none', entryView: 'admin', requiresAuth: true, adminOnly: true,
    },
  ];

  for (const m of modules) {
    await prisma.module.upsert({ where: { id: m.id }, update: m, create: m });
  }

  console.log('Cleaning up old model providers...');
  const validProviderIds = [
    'gpt-image-2-high','gpt-image-2-medium','gpt-image-2-low',
    'gpt-image-25-sunburst','gpt-image-25-flare',
    'imagen-4-ultra','imagen-4-standard','imagen-4-fast',
    'stable-image-ultra','stable-image-core',
    'flux-2-pro','flux-3',
    'seedream-5-pro','seedream-5-lite',
  ];
  await prisma.modelProvider.deleteMany({ where: { id: { notIn: validProviderIds } } });

  console.log('Seeding model providers...');
  // costPerUnit = 원가(KRW), marginRate = 마진율 (유저단가 = costPerUnit × marginRate)
  // 1크레딧 = ₩1
  const providers = [
    // ── OpenAI GPT Image 2 (품질별 3종) ──
    { id: 'gpt-image-2-high', displayName: 'GPT Image 2 (High)', category: 'image', costPerUnit: 290, marginRate: 1.4, styleHint: '', adapterType: 'openai', adapterConfig: '{"model":"gpt-image-1","quality":"high"}' },
    { id: 'gpt-image-2-medium', displayName: 'GPT Image 2 (Medium)', category: 'image', costPerUnit: 73, marginRate: 1.4, styleHint: '', adapterType: 'openai', adapterConfig: '{"model":"gpt-image-1","quality":"medium"}' },
    { id: 'gpt-image-2-low', displayName: 'GPT Image 2 (Low)', category: 'image', costPerUnit: 8, marginRate: 1.4, styleHint: '', adapterType: 'openai', adapterConfig: '{"model":"gpt-image-1","quality":"low"}' },
    // ── OpenAI GPT Image 2.5 (2종) ──
    { id: 'gpt-image-25-sunburst', displayName: 'GPT Image 2.5 Sunburst', category: 'image', costPerUnit: 138, marginRate: 1.4, styleHint: '', adapterType: 'openai', adapterConfig: '{"model":"gpt-image-2.5-sunburst"}' },
    { id: 'gpt-image-25-flare', displayName: 'GPT Image 2.5 Flare', category: 'image', costPerUnit: 69, marginRate: 1.4, styleHint: '', adapterType: 'openai', adapterConfig: '{"model":"gpt-image-2.5-flare"}' },
    // ── Google Imagen 4 (3종) ──
    { id: 'imagen-4-ultra', displayName: 'Imagen 4 Ultra', category: 'image', costPerUnit: 83, marginRate: 1.4, styleHint: '', adapterType: 'imagen', adapterConfig: '{"model":"imagen-4.0-ultra-generate-001"}' },
    { id: 'imagen-4-standard', displayName: 'Imagen 4 Standard', category: 'image', costPerUnit: 55, marginRate: 1.4, styleHint: '', adapterType: 'imagen', adapterConfig: '{"model":"imagen-4.0-generate-001"}' },
    { id: 'imagen-4-fast', displayName: 'Imagen 4 Fast', category: 'image', costPerUnit: 28, marginRate: 1.4, styleHint: '', adapterType: 'imagen', adapterConfig: '{"model":"imagen-4.0-fast-generate-001"}' },
    // ── Stability AI (2종) ──
    { id: 'stable-image-ultra', displayName: 'Stable Image Ultra', category: 'image', costPerUnit: 110, marginRate: 1.4, styleHint: 'artistic, painterly quality', adapterType: 'stability', adapterConfig: '{"endpoint":"ultra"}' },
    { id: 'stable-image-core', displayName: 'Stable Image Core', category: 'image', costPerUnit: 41, marginRate: 1.4, styleHint: '', adapterType: 'stability', adapterConfig: '{"endpoint":"core"}' },
    // ── FLUX via Replicate (2종) ──
    { id: 'flux-2-pro', displayName: 'FLUX 2 Pro', category: 'image', costPerUnit: 55, marginRate: 1.4, styleHint: '', adapterType: 'replicate', adapterConfig: '{"modelId":"black-forest-labs/flux-2-pro"}' },
    { id: 'flux-3', displayName: 'FLUX 3', category: 'image', costPerUnit: 69, marginRate: 1.4, styleHint: '', adapterType: 'replicate', adapterConfig: '{"modelId":"black-forest-labs/flux-3"}' },
    // ── Seedream 5.0 via Replicate (2종) ──
    { id: 'seedream-5-pro', displayName: 'Seedream 5.0 Pro', category: 'image', costPerUnit: 62, marginRate: 1.4, styleHint: '', adapterType: 'replicate', adapterConfig: '{"modelId":"bytedance/seedream-5-pro"}' },
    { id: 'seedream-5-lite', displayName: 'Seedream 5.0 Lite', category: 'image', costPerUnit: 55, marginRate: 1.4, styleHint: '', adapterType: 'replicate', adapterConfig: '{"modelId":"bytedance/seedream-5-lite"}' },
  ];

  for (const p of providers) {
    await prisma.modelProvider.upsert({ where: { id: p.id }, update: p, create: p });
  }

  console.log('Seeding pipelines...');
  const pipelines = [
    {
      id: 'pipeline-3d', displayNameKo: '3D 에셋', displayNameEn: '3D Asset',
      descKo: '이미지나 텍스트로 3D 모델을 생성합니다',
      descEn: 'Generate 3D models from images or text',
      icon: 'box', creditCost: 15, wide: false,
    },
    {
      id: 'pipeline-shortform', displayNameKo: '숏폼 영상', displayNameEn: 'Short Video',
      descKo: '스크립트와 이미지로 숏폼 영상을 합성합니다',
      descEn: 'Compose short videos from scripts and images',
      icon: 'film', creditCost: 20, wide: false,
    },
    {
      id: 'pipeline-detailpage', displayNameKo: '상세페이지', displayNameEn: 'Detail Page',
      descKo: '상품 정보로 이커머스 상세페이지를 자동 생성합니다',
      descEn: 'Auto-generate e-commerce detail pages',
      icon: 'layout-template', creditCost: 10, wide: false,
    },
    {
      id: 'pipeline-game', displayNameKo: '게임 개발', displayNameEn: 'Game Dev',
      descKo: '아이디어를 HTML5 게임으로 만듭니다',
      descEn: 'Turn ideas into HTML5 games',
      icon: 'gamepad-2', creditCost: 25, wide: false,
    },
    {
      id: 'pipeline-copywriting', displayNameKo: 'AI 카피라이팅', displayNameEn: 'AI Copywriting',
      descKo: '마케팅 카피, 슬로건, 광고 문구를 AI로 생성합니다',
      descEn: 'Generate marketing copy, slogans, and ad text with AI',
      icon: 'pen-tool', creditCost: 5, wide: true,
    },
  ];

  for (const p of pipelines) {
    await prisma.pipeline.upsert({ where: { id: p.id }, update: p, create: p });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
