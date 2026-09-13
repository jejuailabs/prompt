/**
 * PLAYLAB seed — full Phase 1~5 demo data.
 * Run: bunx tsx scripts/seed.ts  (or bun run scripts/seed.ts)
 * Generates AI images for artifacts (fallback: styled SVG placeholders).
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

// ───────── AI image generation with SVG fallback ─────────
let zai: any = null;
async function getZai() {
  if (!zai) {
    const mod = await import('z-ai-web-dev-sdk');
    const ZAI = mod.default;
    zai = await ZAI.create();
  }
  return zai;
}

function svgPlaceholder(title: string, c1: string, c2: string, glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="768" height="768" fill="url(#g)"/>
  <circle cx="580" cy="180" r="140" fill="rgba(255,255,255,0.08)"/>
  <circle cx="140" cy="620" r="190" fill="rgba(0,0,0,0.12)"/>
  <text x="384" y="420" font-size="180" text-anchor="middle">${glyph}</text>
  <text x="384" y="540" font-size="40" font-weight="700" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-family="sans-serif">${title}</text>
</svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

async function genImage(prompt: string, relPath: string, title: string, size = '1024x1024'): Promise<string> {
  const outPath = path.join('public', relPath);
  if (fs.existsSync(outPath)) {
    console.log('• image exists, skip', relPath);
    return '/' + relPath;
  }
  try {
    const z = await getZai();
    const res = await z.images.generations.create({ prompt, size });
    const b64 = res?.data?.[0]?.base64;
    if (!b64) throw new Error('empty response');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
    console.log('✓ image', relPath);
    return '/' + relPath;
  } catch (e: any) {
    console.error('✗ image failed, SVG fallback:', relPath, e?.message ?? e);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const svg = svgPlaceholder(title, '#7c3aed', '#2e1065', '✦');
    fs.writeFileSync(outPath + '.svg', Buffer.from(svg.split(',')[1], 'base64'));
    return '/' + relPath + '.svg';
  }
}

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000);
const DAY = 86400000;

async function main() {
  console.log('── PLAYLAB seed start ──');

  // Wipe (FK-safe order)
  await db.contract.deleteMany(); await db.match.deleteMany(); await db.bid.deleteMany();
  await db.problemBrief.deleteMany(); await db.marketplaceListing.deleteMany();
  await db.smokeTestReport.deleteMany(); await db.smokeTest.deleteMany();
  await db.adCampaign.deleteMany(); await db.revenueShare.deleteMany(); await db.paymentAccount.deleteMany();
  await db.pipelineRun.deleteMany(); await db.pipeline.deleteMany();
  await db.generationJob.deleteMany(); await db.creditTransaction.deleteMany(); await db.credits.deleteMany();
  await db.modelProvider.deleteMany();
  await db.comment.deleteMany(); await db.vote.deleteMany(); await db.eventLog.deleteMany();
  await db.artifact.deleteMany(); await db.promptVersion.deleteMany(); await db.prompt.deleteMany();
  await db.module.deleteMany(); await db.profile.deleteMany();

  // ── Profiles ──
  const mkProfile = (username: string, role = 'user', title = 'Creator') =>
    db.profile.create({ data: { username, role, title, createdAt: iso(120) } });

  const admin = await mkProfile('admin', 'admin', 'Admin');
  const demo = await mkProfile('demo');
  const [spaceCreator, pixelDreamer, motionLab, aiTraveler, vibeCoder] = await Promise.all([
    mkProfile('space_creator'), mkProfile('pixel_dreamer'), mkProfile('motion_lab'),
    mkProfile('ai_traveler'), mkProfile('vibe_coder'),
  ]);
  const bots = await Promise.all(Array.from({ length: 10 }, (_, i) => mkProfile(`vibes_${String(i + 1).padStart(2, '0')}`)));
  const everyone = [admin, demo, spaceCreator, pixelDreamer, motionLab, aiTraveler, vibeCoder, ...bots];
  console.log('✓ profiles', everyone.length);

  // ── Modules (registry mirror) ──
  const { MODULE_CONFIGS } = await import('../src/lib/registry/module-configs');
  for (const c of MODULE_CONFIGS) {
    await db.module.create({
      data: {
        id: c.id, phase: c.phase, titleKo: c.titleKo, titleEn: c.titleEn,
        descKo: c.descKo, descEn: c.descEn, icon: c.icon, navOrder: c.navOrder,
        enabled: c.enabled, status: c.status,
        newUntil: c.newUntilDays ? new Date(Date.now() + c.newUntilDays * DAY) : null,
        mainScreenSlot: c.mainScreenSlot, entryView: c.entryView,
        requiresAuth: c.requiresAuth, adminOnly: c.adminOnly,
        navGroup: (c as any).group ?? null,
      },
    });
  }
  console.log('✓ modules', MODULE_CONFIGS.length);

  // ── Model providers ──
  const providers = [
    { id: 'midjourney-v7', displayName: 'Midjourney v7', category: 'image', costPerUnit: 4, styleHint: 'cinematic, painterly, dramatic lighting, artistic composition, ultra detailed' },
    { id: 'dalle-3', displayName: 'DALL-E 3', category: 'image', costPerUnit: 3, styleHint: 'clean digital illustration, vibrant colors, soft lighting' },
    { id: 'stable-diffusion-3.5', displayName: 'Stable Diffusion 3.5', category: 'image', costPerUnit: 2.5, styleHint: 'photorealistic, highly detailed, sharp focus, 85mm' },
    { id: 'leonardo-phoenix', displayName: 'Leonardo Phoenix', category: 'image', costPerUnit: 3.5, styleHint: 'concept art, fantasy, rich textures, epic scale' },
    { id: 'runway-gen4', displayName: 'Runway Gen-4', category: 'video', costPerUnit: 15, styleHint: 'cinematic motion, film grain' },
  ];
  for (const p of providers) await db.modelProvider.create({ data: p });
  console.log('✓ providers', providers.length);

  // ── Pipelines ──
  const pipelines = [
    { id: 'pipeline-3d', displayNameKo: '3D 에셋', displayNameEn: '3D Asset', descKo: '이미지/텍스트 한 줄로 3D 에셋을 생성하고 뷰어에서 회전 미리보기', descEn: 'Generate 3D assets and preview in a rotatable viewer', icon: 'box', creditCost: 10, wide: false },
    { id: 'pipeline-shortform', displayNameKo: '숏폼 영상', displayNameEn: 'Shortform Video', descKo: '주제만 넣으면 스크립트·장면 생성부터 영상 조립까지 한 번에', descEn: 'From topic to assembled short video', icon: 'clapperboard', creditCost: 15, wide: false },
    { id: 'pipeline-detailpage', displayNameKo: '상세페이지', displayNameEn: 'Detail Page', descKo: '상품 정보를 넣으면 이커머스 상세페이지가 자동 조립됩니다', descEn: 'Auto-assemble ecommerce detail pages', icon: 'layout-panel-left', creditCost: 5, wide: false },
    { id: 'pipeline-game', displayNameKo: '게임 개발', displayNameEn: 'Game Dev', descKo: '장르와 테마를 고르면 플레이 가능한 HTML5 게임을 조립해 샌드박스에서 바로 실행', descEn: 'Assemble a playable HTML5 game, run in sandbox', icon: 'gamepad-2', creditCost: 20, wide: false },
    { id: 'pipeline-copy', displayNameKo: 'AI 카피라이팅', displayNameEn: 'AI Copywriting', descKo: '타깃과 톤을 지정하면 헤드라인·본문·CTA 카피 3안을 생성합니다', descEn: 'Generate headline/body/CTA copy variants', icon: 'pen-tool', creditCost: 2, wide: true },
  ];
  for (const p of pipelines) await db.pipeline.create({ data: p });
  console.log('✓ pipelines', pipelines.length);

  // ── AI images ──
  const img = {
    hero: await genImage('cute robot character mascot floating with glowing game controller, 3d cube and chart icons around, violet purple neon gradient dark background, playful creative tool vibe, high quality 3d render', 'uploads/seed/hero-illustration.png', 'PLAYLAB', '1024x1024'),
    citySim: await genImage('futuristic neon city simulation at night, flying drones, purple holograms, cinematic aerial view, ultra detailed', 'uploads/seed/thumb-city-sim.png', 'NEON CITY', '1344x768'),
    travelApp: await genImage('modern travel planner mobile app concept, map interface with route cards, violet accent UI, clean product shot on gradient background', 'uploads/seed/thumb-travel-app.png', 'AI TRAVEL PLANNER', '1024x1024'),
    shooter: await genImage('retro arcade space shooter game cover, pixel art spaceship fighting alien wave, purple neon glow, dark background, dramatic', 'uploads/seed/thumb-space-shooter.png', 'SPACE SHOOTER', '1024x1024'),
    robot: await genImage('cute robot character 3d render, violet white color scheme, studio lighting, dark gradient background, toy-like, centered', 'uploads/seed/thumb-robot.png', 'ROBOT COCO', '1024x1024'),
    sneaker: await genImage('premium sneaker product photography, floating on violet gradient studio background, dramatic rim light, commercial shot', 'uploads/seed/thumb-sneaker.png', 'SNEAKER', '1344x768'),
    fantasy: await genImage('epic fantasy landscape painting, floating islands, waterfalls into clouds, golden hour, painterly brush strokes', 'uploads/seed/thumb-fantasy.png', 'FANTASY', '1344x768'),
    cyberpunk: await genImage('cyberpunk portrait of woman with neon violet visor, rain reflections, cinematic bokeh, photorealistic', 'uploads/seed/thumb-cyberpunk.png', 'CYBERPUNK', '1024x1024'),
    isometric: await genImage('isometric miniature game world diorama, tiny castle and trees, violet pastel palette, clean render', 'uploads/seed/thumb-isometric.png', 'ISOMETRIC', '1344x768'),
    f1: await genImage('vertical cinematic night city street with neon signs, rain, drone shot start frame, moody purple', 'uploads/seed/frame-city-1.png', 'FRAME1', '768x1344'),
    f2: await genImage('vertical aerial drone view over neon skyline at night, moving forward, purple haze', 'uploads/seed/frame-city-2.png', 'FRAME2', '768x1344'),
    f3: await genImage('vertical low angle futuristic bridge with hologram billboards, night, violet reflections on wet road', 'uploads/seed/frame-city-3.png', 'FRAME3', '768x1344'),
  };

  // Seed game html from template
  const tpl = fs.readFileSync('public/games/space-shooter.template.html', 'utf-8');
  const gameHtml = tpl.replace(/\{\{TITLE\}\}/g, 'SPACE RAIDER').replace(/\{\{PALETTE\}\}/g, '#a78bfa').replace(/\{\{SPEED\}\}/g, '3');
  fs.mkdirSync('public/games', { recursive: true });
  fs.writeFileSync('public/games/space-shooter.html', gameHtml);
  console.log('✓ game html');

  // ── Prompts ──
  const mkPrompt = async (data: { owner: string; title: string; body: string; category: string; modelTags: string[]; days: number; forkedFromId?: string; status?: string }) =>
    db.prompt.create({
      data: {
        ownerId: data.owner, title: data.title, body: data.body, category: data.category,
        modelTags: JSON.stringify(data.modelTags), forkedFromId: data.forkedFromId,
        createdAt: iso(data.days), status: data.status ?? 'active',
      },
    });

  const p1 = await mkPrompt({
    owner: spaceCreator.id, title: '시네마틱 도시 야경 생성 프롬프트', category: '이미지',
    modelTags: ['Midjourney v7', 'DALL-E 3'], days: 21,
    body: '미래 도시의 야경을 시네마틱하게 생성해줘.\n\n- 시점: 드론 공중 샷, 살짝 하이앵글\n- 조명: 네온 간판 + 홀로그램 보라 톤, 습한 반사\n- 분위기: 레트로퓨처리즘, 필름 그레인 살짝\n- 제외: 사람 대군, 낮 장면',
  });
  const p2 = await mkPrompt({
    owner: vibeCoder.id, title: '제품 상세페이지 카피 생성', category: '마케팅',
    modelTags: ['Claude'], days: 18,
    body: '아래 상품 정보로 이커머스 상세페이지 카피를 만들어줘.\n\n입력: {상품명, 타깃, 핵심 특징 3가지, 가격대}\n출력 형식:\n1) 헤드라인 3안 (감각형/기능형/공감형)\n2) 섹션별 바디카피 (특징→베네핗 전환 포함)\n3) CTA 문구 2안',
  });
  const p3 = await mkPrompt({
    owner: pixelDreamer.id, title: '게임 컨셉 아트 생성기', category: '게임',
    modelTags: ['Leonardo Phoenix', 'Stable Diffusion 3.5'], days: 15,
    body: '게임 장르: {장르}\n세계관 한 줄: {설명}\n\n컨셉 아트를 생성하되:\n- 키 컬러 2개 지정\n- 주요 오브젝트 3개 이상 포함\n- 라이팅은 림라이트 + 네온\n- 아웃풋은 16:9',
  });
  const p4 = await mkPrompt({
    owner: motionLab.id, title: 'SNS 숏폼 스크립트 3컷', category: '영상',
    modelTags: ['Claude'], days: 12,
    body: '주제: {주제}\n톤: {톤}\n\n3컷 구성으로 숏폼 스크립트 작성:\n- 컷1(0-3초): 강한 훅 — 질문/충격 사실\n- 컷2(3-12초): 핵심 정보 2가지, 자막 문구 포함\n- 컷3(12-20초): CTA + 다음 영상 예고\n각 컷에 이미지 프롬프트도 함께 출력.',
  });
  const p4v2 = await mkPrompt({
    owner: motionLab.id, title: 'SNS 숏폼 스크립트 3컷 v2 — 훅 강화', category: '영상',
    modelTags: ['Claude'], days: 9, forkedFromId: p4.id,
    body: '주제: {주제}\n톤: {톤}\n\n3컷 구성으로 숏폼 스크립트 작성:\n- 컷1(0-2초): 반전 훅 — 공통 오해 제시 후 부정\n- 컷2(2-12초): 핵심 정보 2가지, 숫자로 구체화, 자막 문구 포함\n- 컷3(12-18초): CTA + 댓글 유도 질문\n각 컷에 이미지 프롬프트도 함께 출력. 전체 문장은 12자 이내로 끊어 리듬감 유지.',
  });
  await db.promptVersion.create({ data: { promptId: p4v2.id, body: p4v2.body, versionNote: '훅을 반전형으로 교체, 리듬 지침 추가', createdBy: motionLab.id, createdAt: iso(9) } });
  const p5 = await mkPrompt({
    owner: pixelDreamer.id, title: '3D 캐릭터 컨셉 디자인', category: '게임',
    modelTags: ['Midjourney v7'], days: 8,
    body: '귀여운 3D 캐릭터를 디자인해줘.\n- 실루엣: 둥근 형태, 큰 머리 비율\n- 컬러: 바이올렛 + 화이트 2톤\n- 소품: 1개 (성격을 드러내는)\n- 배경: 단색 그라데이션, 스튜디오 라이트',
  });
  const p6 = await mkPrompt({
    owner: aiTraveler.id, title: '여행 일정 플래너 앱 기획 프롬프트', category: '코딩',
    modelTags: ['Claude'], days: 7,
    body: 'AI 여행 플래너 앱의 MVP 기능 명세를 만들어줘.\n\n포함: 사용자 여정 5단계, 핵심 화면 목록, 데이터 모델 초안, 외부 API 3개\n제약: 1인 개발 4주, 모바일 우선',
  });
  const p7 = await mkPrompt({
    owner: admin.id, title: '코드 리뷰 보조 프롬프트', category: '코딩',
    modelTags: ['Claude'], days: 5,
    body: '아래 코드를 리뷰해줘.\n1) 버그 가능성 순위\n2) 성능 이슈\n3) 가독성 개선안\n각 항목에 코드 스니펫 제안 포함. 칭찬은 마지막에 한 줄만.',
  });
  const p8 = await mkPrompt({
    owner: demo.id, title: '저녁 식사 레시피 사진 스타일', category: '이미지',
    modelTags: ['DALL-E 3'], days: 3,
    body: '집밥 레시피 사진을 먹고 싶게 찍는 스타일 가이드:\n- 자연광 + 흰 테이블\n- 김이 나는 연출, 45도 앵글\n- 소품은 2개 이하로 절제',
  });
  const prompts = [p1, p2, p3, p4, p4v2, p5, p6, p7, p8];
  console.log('✓ prompts', prompts.length);

  // ── Votes & comments ──
  const voteMatrix: [string, number][] = [
    [p1.id, 11], [p2.id, 7], [p3.id, 9], [p4.id, 6], [p4v2.id, 8], [p5.id, 5], [p6.id, 7], [p7.id, 3], [p8.id, 2],
  ];
  for (const [promptId, n] of voteMatrix) {
    const owner = prompts.find((p: any) => p.id === promptId)!.ownerId;
    const voters = everyone.map((e) => e.id).filter((id) => id !== owner).slice(0, n);
    for (const userId of voters) {
      await db.vote.create({ data: { targetType: 'prompt', targetId: promptId, userId, createdAt: iso(2) } });
    }
  }
  const commentSeeds = [
    { t: 'prompt', id: p1.id, u: motionLab.id, b: '하이앵글 각도 값까지 넣으니까 결과가 확 안정돼요. 채택!' },
    { t: 'prompt', id: p1.id, u: vibeCoder.id, b: '네온 톤 hex 지정하는 줄 추가했더니 더 좋아졌습니다.' },
    { t: 'prompt', id: p2.id, u: aiTraveler.id, b: '베네핏 전환 줄이 진짜 꿀팁. 상세페이지 CTR 올라갔어요.' },
    { t: 'prompt', id: p3.id, u: spaceCreator.id, b: '16:9 강제 덕분에 배너로 바로 썼습니다.' },
    { t: 'prompt', id: p4v2.id, u: demo.id, b: 'v1보다 훅이 훨씬 강해졌네요. 리듬 지침이 핵심.' },
    { t: 'prompt', id: p6.id, u: vibeCoder.id, b: '이걸로 기획서 뽑아서 개발자 매칭까지 갔어요 ㅋㅋ' },
  ];
  for (const c of commentSeeds) {
    await db.comment.create({ data: { targetType: c.t, targetId: c.id, userId: c.u, body: c.b, createdAt: iso(1) } });
  }
  console.log('✓ votes & comments');

  // ── Artifacts ──
  const mkArtifact = (data: any) =>
    db.artifact.create({
      data: {
        ownerId: data.ownerId, type: data.type, title: data.title, description: data.description ?? '',
        sourcePromptId: data.sourcePromptId ?? null, sourceModule: data.sourceModule ?? null,
        fileUrl: data.fileUrl ?? null, contentUrl: data.contentUrl ?? null,
        metadata: JSON.stringify(data.metadata ?? {}), executionTier: data.executionTier ?? null,
        status: data.status ?? 'published', version: data.version ?? 'v1.0.0',
        views: data.views ?? 0, createdAt: iso(data.days ?? 5),
      },
    });

  const landingContent = {
    hero: { title: '걸을수록 나아지는 운동화', subtitle: '클라우드 폼 솔로 테크놀로지 — 하루 10,000보도 무릎 걱정 없이', cta: '런칭 특가 35% 보기' },
    sections: [
      { title: '왜 클라우드 폼인가', body: '기존 EVA 소폼 대비 2.1배의 반발력과 40% lighter 소재 무게.', bullets: ['2.1배 반발력', '238g 초경량', '통기성 메시 풀커버'] },
      { title: '하루 종일 편안한 이유', body: '발볼 4방향 확장 구조로 부은 발에도 자유롭습니다.', bullets: ['4D 스트레치 노브', '아치 서포트 내장', '방수 기본 적용'] },
      { title: '사용자 리뷰', body: '"테트리스 마라톤 3회차 — 여전히 편해요" ★★★★★ 4.9 / 5 (2,314 리뷰)', bullets: [] },
    ],
    faq: [{ q: '사이즈는 정사이즈인가요?', a: '네, 정사이즈를 권장합니다. 넓은 발볼은 한 사이즈 업.' }],
    footer: '무료 배송 · 30일 무료 반품 · 1년 A/S',
  };
  const copyContent = {
    hero: { title: '새벽 다섯 시, 커피가 깨어난다', subtitle: '로스팅 당일 배송되는 스몰배치 스페셜티', cta: '첫 구매 50% 쿠폰' },
    sections: [
      { title: 'Variant A — 감각형', body: '텀블러에 부은 순간, 당신의 하루가 로스팅됩니다.\n산미는 밝게, 여운은 길게. 매주 목요일 로스팅.', bullets: ['헤드라인: 하루의 로스팅', 'CTA: 이번 주 배송 받기'] },
      { title: 'Variant B — 기능형', body: '원두 산지·로스팅일·풍미 노트를 투명하게 공개합니다.\n캔두 커피도 단 3분.', bullets: ['헤드라인: 공개된 원두', 'CTA: 3분 레시피 보기'] },
      { title: 'Variant C — 공감형', body: '아침을 위해 일어나는 당신에게, 제대로 된 한 잔.\n오늘의 커피가 내일의 활력이 됩니다.', bullets: ['헤드라인: 제대로 된 한 잔', 'CTA: 구독 시작하기'] },
    ],
    footer: 'PLAYLAB AI 카피라이팅 파이프라인 산출물',
  };
  const academyIntro = {
    hero: { title: '바이브코딩 입문 — 프롬프트에서 출시까지', subtitle: 'PLAYLAB 아카데미 오리엔테이션', cta: '시작하기' },
    sections: [
      { title: '1강. 프롬프트 전시실 둘러보기', body: '좋은 프롬프트는 자산입니다. 갤러리에서 인기 프롬프트를 포크해 나만의 버전을 만드는 연습을 합니다.', bullets: ['포크 버튼 위치', '모델 태그 읽는 법'] },
      { title: '2강. 모델 실험실로 비교하기', body: '같은 프롬프트를 모델 4종에 태워 결과와 비용을 비교합니다. 필요 크레딧이 생성 전에 표시되는 이유를 설명합니다.', bullets: ['크레딧 마진 구조', '비교 그리드 읽는 법'] },
      { title: '3강. 파이프라인으로 완성하기', body: '3D 에셋, 숏폼, 상세페이지, 게임까지 — 파이프라인 실행과 결과물 게시.', bullets: ['실행 큐', '전시실 게시'] },
    ],
    footer: 'PLAYLAB Academy',
  };
  const academyLab = {
    hero: { title: '프롬프트 엔지니어링 5단계', subtitle: 'PLAYLAB 아카데미 심화', cta: '학습 시작' },
    sections: [
      { title: 'Step 1. 역할 부여', body: '모델에게 페르소나를 줍니다. "당신은 전환율에 강한 카피라이터입니다".', bullets: [] },
      { title: 'Step 2. 입력 스키마 고정', body: '변수를 {중괄호}로 고정하면 재사용성이 급상승합니다.', bullets: [] },
      { title: 'Step 3. 출력 형식 명세', body: 'JSON 키를 직접 명시하면 후처리 코드가 사라집니다.', bullets: [] },
      { title: 'Step 4. 예시 2개', body: 'Few-shot은 2개면 충분. 3개부터는 토큰 낭비입니다.', bullets: [] },
      { title: 'Step 5. 평가 루프', body: '결과를 점수화하는 채점 프롬프트를 붙여 자동 개선합니다.', bullets: [] },
    ],
    footer: 'PLAYLAB Academy',
  };

  const aGame = await mkArtifact({
    ownerId: spaceCreator.id, type: 'game', title: '우주 비행 슈팅 게임', version: 'v1.3.2', days: 6, views: 3841,
    description: '웨이브 방어 슈팅. 모바일 터치 지원, 5웨이브마다 적 속도 상승. PLAYLAB 파이프라인으로 조립했습니다.',
    fileUrl: img.shooter, contentUrl: '/games/space-shooter.html', executionTier: 'iframe', sourceModule: 'pipeline-hub',
    metadata: {
      tags: ['게임', '슈팅', '아케이드'], categoryLabel: '게임', engine: 'iframe-sandbox',
      stats: { views: 3841, plays: 1204, likes: 342, completionRate: 61 },
      versions: [
        { version: 'v1.0.0', date: iso(30).toISOString().slice(0, 10), note: '첫 프로토타입 (1웨이브)' },
        { version: 'v1.1.0', date: iso(22).toISOString().slice(0, 10), note: '모바일 터치 조작 추가' },
        { version: 'v1.2.0', date: iso(14).toISOString().slice(0, 10), note: '파티클 이펙트, 웨이브 밸런싱' },
        { version: 'v1.3.2', date: iso(6).toISOString().slice(0, 10), note: '난이도 곡선 개선, 버그 픽스' },
      ],
    },
  });
  const aTravel = await mkArtifact({
    ownerId: aiTraveler.id, type: 'app', title: 'AI 여행 플래너 앱', days: 20, views: 2750,
    description: '취향 기반으로 일정을 짜주는 여행 플래너. 스모크테스트에서 성공 점수 82점을 받았습니다.',
    fileUrl: img.travelApp, sourceModule: 'prompt-wiki', sourcePromptId: p6.id,
    metadata: { tags: ['앱', '여행', 'AI'], categoryLabel: '앱', stats: { views: 2750, plays: 890, likes: 214, completionRate: 44 } },
  });
  const aVideo = await mkArtifact({
    ownerId: motionLab.id, type: 'video', title: '네온 도시 시뮬레이션', days: 9, views: 1980,
    description: '드론 나이트 시티 풍의 숏폼. 숏폼 파이프라인으로 키프레임 3장을 생성해 조립했습니다.',
    fileUrl: img.f1, sourceModule: 'pipeline-hub',
    metadata: { frames: [img.f1, img.f2, img.f3], duration: '02:36', tags: ['영상', '시티'], categoryLabel: '숏폼', stats: { views: 1980, plays: 1520, likes: 176, completionRate: 72 } },
  });
  const a3d = await mkArtifact({
    ownerId: pixelDreamer.id, type: '3d_asset', title: "3D 로봇 캐릭터 '코코'", days: 11, views: 1420,
    description: '귀여운 로봇 캐릭터 3D 에셋. 뷰어에서 회전해보세요.',
    fileUrl: img.robot, sourceModule: 'pipeline-hub',
    metadata: { previewUrl: img.robot, tags: ['3D', '캐릭터'], categoryLabel: '3D', stats: { views: 1420, plays: 640, likes: 98, completionRate: 55 } },
  });
  const aLanding = await mkArtifact({
    ownerId: demo.id, type: 'landing_page', title: '운동화 스마트 상세페이지', days: 8, views: 960,
    description: '상품 정보만 넣어 자동 조립한 이커머스 상세페이지. 수익공유로 입점 중입니다.',
    fileUrl: img.sneaker, sourceModule: 'pipeline-hub',
    metadata: { content: landingContent, tags: ['이커머스', '상세페이지'], categoryLabel: '상세페이지', stats: { views: 960, plays: 410, likes: 64, completionRate: 39 } },
  });
  const aFantasy = await mkArtifact({
    ownerId: pixelDreamer.id, type: 'image', title: '판타지 풍경 — Midjourney 스타일', days: 7, views: 870,
    description: '모델 실험실에서 4개 모델로 비교 생성 후 베스트 결과를 게시했습니다.',
    fileUrl: img.fantasy, sourceModule: 'model-lab', sourcePromptId: p1.id,
    metadata: { model: 'Midjourney v7', params: { aspect: '16:9' }, tags: ['이미지', '풍경'], categoryLabel: '이미지', stats: { views: 870, plays: 0, likes: 45, completionRate: 0 } },
  });
  const aCyber = await mkArtifact({
    ownerId: motionLab.id, type: 'image', title: '사이버펑크 초상화 — SD 3.5', days: 5, views: 640,
    description: 'Stable Diffusion 3.5 결과물. 원가 대비 가장 저렴했던 모델.',
    fileUrl: img.cyberpunk, sourceModule: 'model-lab', sourcePromptId: p1.id,
    metadata: { model: 'Stable Diffusion 3.5', params: { aspect: '1:1' }, tags: ['이미지', '인물'], categoryLabel: '이미지', stats: { views: 640, plays: 0, likes: 32, completionRate: 0 } },
  });
  const aIso = await mkArtifact({
    ownerId: spaceCreator.id, type: 'image', title: '아이소메트릭 게임 월드 — DALL-E 3', days: 4, views: 510,
    description: '게임 배경으로 쓸 아이소메트릭 월드. DALL-E 3 결과.',
    fileUrl: img.isometric, sourceModule: 'model-lab', sourcePromptId: p3.id,
    metadata: { model: 'DALL-E 3', params: { aspect: '16:9' }, tags: ['이미지', '게임'], categoryLabel: '이미지', stats: { views: 510, plays: 0, likes: 27, completionRate: 0 } },
  });
  const aCopy = await mkArtifact({
    ownerId: vibeCoder.id, type: 'text', title: 'AI 카피라이팅 — 커피브랜드 런칭', days: 3, views: 420,
    description: '카피라이팅 파이프라인 산출물 3안. 마음에 드는 안을 선택해 상세페이지로 넘길 수 있습니다.',
    fileUrl: null, sourceModule: 'pipeline-hub',
    metadata: { content: copyContent, tags: ['카피', '마케팅'], categoryLabel: '카피라이팅', stats: { views: 420, plays: 0, likes: 21, completionRate: 0 } },
  });
  const aAcademy1 = await mkArtifact({
    ownerId: admin.id, type: 'text', title: '[아카데미] 바이브코딩 입문 오리엔테이션', days: 25, views: 2310,
    description: '전시실 → 실험실 → 파이프라인 → 출시까지의 전체 지도.',
    fileUrl: null, sourceModule: 'academy',
    metadata: { content: academyIntro, tags: ['아카데미', '입문'], categoryLabel: '아카데미', stats: { views: 2310, plays: 0, likes: 130, completionRate: 0 } },
  });
  const aAcademy2 = await mkArtifact({
    ownerId: admin.id, type: 'text', title: '[아카데미] 프롬프트 엔지니어링 5단계', days: 16, views: 1870,
    description: '역할 부여부터 평가 루프까지, 재사용 가능한 프롬프트 만드는 법.',
    fileUrl: null, sourceModule: 'academy',
    metadata: { content: academyLab, tags: ['아카데미', '심화'], categoryLabel: '아카데미', stats: { views: 1870, plays: 0, likes: 111, completionRate: 0 } },
  });
  const aDraft = await mkArtifact({
    ownerId: demo.id, type: 'image', title: '내 첫 3D 로봇 리터치 (초안)', days: 1, views: 0, status: 'draft',
    description: '모델 실험실에서 생성한 초안. 아직 전시실에 게시 전입니다.',
    fileUrl: img.robot, sourceModule: 'model-lab',
    metadata: { model: 'Leonardo Phoenix', params: { aspect: '1:1' }, tags: ['3D'], categoryLabel: '이미지' },
  });
  const artifacts = [aGame, aTravel, aVideo, a3d, aLanding, aFantasy, aCyber, aIso, aCopy, aAcademy1, aAcademy2, aDraft];
  console.log('✓ artifacts', artifacts.length);

  // artifact votes
  const artVotes: [string, number][] = [[aGame.id, 9], [aTravel.id, 8], [aVideo.id, 7], [a3d.id, 6], [aLanding.id, 4], [aFantasy.id, 5], [aCyber.id, 3], [aIso.id, 3], [aCopy.id, 2]];
  for (const [artifactId, n] of artVotes) {
    const owner = artifacts.find((a: any) => a.id === artifactId)!.ownerId;
    const voters = everyone.map((e) => e.id).filter((id) => id !== owner).slice(0, n);
    for (const userId of voters) await db.vote.create({ data: { targetType: 'artifact', targetId: artifactId, userId } });
  }
  const artComments = [
    { id: aGame.id, u: demo.id, b: '웨이브 5까지 갔습니다! 모바일 터치 조작 감사해요.' },
    { id: aGame.id, u: pixelDreamer.id, b: '파티클 이펙트가 진짜 예쁘네요. 컨셉아트도 공유해주세요!' },
    { id: aTravel.id, u: vibeCoder.id, b: '스모크테스트 82점 부러워요. 리포트 공개해주신다니 ㅠㅠ' },
    { id: aVideo.id, u: spaceCreator.id, b: '2컷 드론 앵글이 하이라이트네요.' },
  ];
  for (const c of artComments) await db.comment.create({ data: { targetType: 'artifact', targetId: c.id, userId: c.u, body: c.b } });

  // ── Credits & transactions ──
  const balanceOf: Record<string, number> = {
    [admin.id]: 999999, [demo.id]: 100000, [spaceCreator.id]: 5400, [pixelDreamer.id]: 3200,
    [motionLab.id]: 4100, [aiTraveler.id]: 2600, [vibeCoder.id]: 1800,
    ...Object.fromEntries(bots.map((b) => [b.id, 500])),
  };
  for (const [userId, balance] of Object.entries(balanceOf)) {
    await db.credits.create({ data: { userId, balance } });
  }
  const tx = [
    { userId: demo.id, amount: 100000, reason: 'purchase', days: 30 },
    { userId: demo.id, amount: -38400, reason: 'generation_job', days: 12 },
    { userId: demo.id, amount: -15600, reason: 'pipeline_run', days: 9 },
    { userId: demo.id, amount: -21320, reason: 'pipeline_run', days: 8 },
    { userId: demo.id, amount: -4000, reason: 'generation_job', days: 2 },
  ];
  for (const t of tx) await db.creditTransaction.create({ data: { userId: t.userId, amount: t.amount, reason: t.reason, createdAt: iso(t.days) } });
  console.log('✓ credits');

  // ── Smoke tests ──
  const campaignDone = await db.adCampaign.create({
    data: { artifactId: aTravel.id, budget: 150000, startAt: iso(18), endAt: iso(4), status: 'completed', createdAt: iso(19) },
  });
  const stDone = await db.smokeTest.create({
    data: { artifactId: aTravel.id, requestedById: aiTraveler.id, status: 'completed', budget: 150000, days: 14, adCampaignId: campaignDone.id, requestedAt: iso(19), completedAt: iso(4) },
  });
  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i + 4) * DAY);
    const visitors = Math.round(220 + i * 38 + Math.sin(i / 2) * 90);
    return { date: d.toISOString().slice(0, 10), visitors, signups: Math.round(visitors * (0.19 + i * 0.004)) };
  });
  const impressions = 128400, clicks = 3960, ctr = +(clicks / impressions * 100).toFixed(2), signups = 871, conversions = 113, cac = Math.round(150000 / conversions);
  await db.smokeTestReport.create({
    data: {
      smokeTestId: stDone.id,
      metrics: JSON.stringify({ impressions, clicks, ctr, signups, conversions, cac, daily }),
      recommendation: JSON.stringify([
        '25-34 여성 타깃의 CTR이 평균 대비 2.3배 높았습니다 — 메인 카피를 이 세그먼트에 맞춰보세요.',
        '일정 자동 생성 화면이 전환 포인트입니다. 온보딩 2단계로 앞당기는 것을 권장합니다.',
        '가격 비교 섹션 대신 "3분 완성" 데모 영상이 노출되는 구간에서 이탈이 가장 적었습니다.',
        '개선 시 예상 전환율 +1.8%p — 다음 테스트에서 확인 가능합니다.',
      ]),
      successScore: 82,
      createdAt: iso(4),
    },
  });
  const campaignPending = await db.adCampaign.create({
    data: { artifactId: aGame.id, budget: 150000, status: 'draft', createdAt: iso(1) },
  });
  await db.smokeTest.create({
    data: { artifactId: aGame.id, requestedById: demo.id, status: 'requested', budget: 150000, days: 14, adCampaignId: campaignPending.id, requestedAt: iso(1) },
  });
  console.log('✓ smoke tests');

  // ── Revenue (demo user) ──
  await db.paymentAccount.create({
    data: { userId: demo.id, provider: 'stripe_connect', externalAccountId: 'acct_demo_1PG4xK', status: 'active', totalEarned: 353000, createdAt: iso(90) },
  });
  const shares = [
    { artifactId: aLanding.id, amount: 84000, period: '2026-06', status: 'settled', days: 75 },
    { artifactId: aLanding.id, amount: 112000, period: '2026-07', status: 'settled', days: 48 },
    { artifactId: aLanding.id, amount: 96000, period: '2026-08', status: 'settled', days: 20 },
    { artifactId: aLanding.id, amount: 61000, period: '2026-09', status: 'pending', days: 3 },
  ];
  for (const s of shares) await db.revenueShare.create({ data: { artifactId: s.artifactId, payeeUserId: demo.id, sharePercent: 70, amount: s.amount, period: s.period, status: s.status, createdAt: iso(s.days) } });
  console.log('✓ revenue');

  // ── Marketplace listings ──
  await db.marketplaceListing.create({ data: { artifactId: aTravel.id, listedById: aiTraveler.id, revenueModel: 'ad_share', status: 'active', createdAt: iso(15) } });
  await db.marketplaceListing.create({ data: { artifactId: aGame.id, listedById: spaceCreator.id, revenueModel: 'freemium', status: 'active', createdAt: iso(10) } });
  await db.marketplaceListing.create({ data: { artifactId: a3d.id, listedById: pixelDreamer.id, revenueModel: 'paid', price: 5000, status: 'active', createdAt: iso(7) } });
  console.log('✓ listings');

  // ── Briefs (Phase 5) ──
  const spec1 = {
    title: '병원 예약 관리 앱', problem: '지역 병원이 전화로만 예약을 받아 노쇼가 많고 관리가 번거롭다',
    targetUsers: '중소 병원 관리자와 환자', features: ['예약 생성/취소', '노쇼 방지 알림톡', '예약 대기열', '관리자 캘린더'],
    techStack: ['Next.js', 'Prisma', 'Aligo API'], pages: ['예약', '내 예약', '관리자 대시보드'],
    effortWeeks: 6, suggestedBudgetKrw: 1500000, risks: ['개인정보(진료정보) 처리 주의', '알림톡 템플릿 심사 필요'],
  };
  const b1 = await db.problemBrief.create({
    data: { authorId: demo.id, title: spec1.title, rawText: '우리 병원 예약이 전화로만 되는데, 노쇼도 많아요. 온라인 예약 앱 만들어줘. 알림톡도 보내고 싶어요.', structuredSpec: JSON.stringify(spec1), category: '의료/예약', budget: 1500000, status: 'approved', createdAt: iso(10) },
  });
  await db.bid.create({ data: { briefId: b1.id, developerId: vibeCoder.id, proposal: '노쇼 방지 알림톡 자동화 경험 3회. 2주차에 MVP 데모 제공, 알림톡 템플릿 심사도 대행합니다.', price: 1200000, etaDays: 21, createdAt: iso(6) } });
  await db.bid.create({ data: { briefId: b1.id, developerId: motionLab.id, proposal: '캘린더 UX 특화. 대기열 기능은 2차 스프린트로 분리해 일정 단축 가능.', price: 950000, etaDays: 14, createdAt: iso(5) } });

  const spec2 = {
    title: '동네 플로깅 챌린지 SNS', problem: '러닝 크루가 채팅방으로 인증을 공유하는데 기록이 남지 않는다',
    targetUsers: '러닝 크루 멤버', features: ['러닝 인증 업로드', '크루 랭킹', '주간 챌린지', 'GPS 거리 연동'],
    techStack: ['Next.js', 'Supabase', 'Kakao Map'], pages: ['피드', '크루 페이지', '챌린지'],
    effortWeeks: 4, suggestedBudgetKrw: 1000000, risks: ['GPS 배터리 소모 최적화 필요'],
  };
  const b2 = await db.problemBrief.create({
    data: { authorId: pixelDreamer.id, title: spec2.title, rawText: '러닝 크루원들끼리 인증하고 랭킹 볼 수 있는 SNS 만들고 싶어요.', structuredSpec: JSON.stringify(spec2), category: '운동/커뮤니티', budget: 1000000, status: 'matched', createdAt: iso(25) },
  });
  const bid2 = await db.bid.create({ data: { briefId: b2.id, developerId: spaceCreator.id, proposal: '지도/사용자 위치 기반 앱 2건 출시 경험. 주간 챌린지 로직은 서버리스 크론으로 안정 구현.', price: 1500000, etaDays: 28, status: 'accepted', createdAt: iso(20) } });
  const m2 = await db.match.create({ data: { briefId: b2.id, bidId: bid2.id, matchedAt: iso(12) } });
  await db.contract.create({
    data: {
      matchId: m2.id,
      revenueShareTerms: JSON.stringify({ developerShare: 70, platformShare: 30, milestones: ['1주차: 디자인 시스템', '2주차: 피드+인증 MVP', '3주차: 크루 랭킹', '4주차: 출시 QA'], notes: '출시 후 6개월간 수익의 70%를 개발자에게 지급. 광고 수익 포함.' }),
      status: 'active', createdAt: iso(12),
    },
  });
  const spec3 = {
    title: '반려견 사진 AI 그림자 도감', problem: '반려견 사진을 찍으면 AI가 품종/감정을 기록해 도감처럼 쌓아주는 앱이 없다',
    targetUsers: '반려인 1천만', features: ['사진 업로드', 'AI 품종/감정 태깅', '도감 카드 생성', '월간 리포트'],
    techStack: ['Next.js', 'Vision API'], pages: ['카메라', '도감', '공유'],
    effortWeeks: 3, suggestedBudgetKrw: 800000, risks: ['품종 분류 정확도 검증 필요'],
  };
  await db.problemBrief.create({
    data: { authorId: vibeCoder.id, title: spec3.title, rawText: '강아지 사진 찍을 때마다 자동으로 태그 붙어서 도감으로 모이는 앱 있으면 좋겠어요.', structuredSpec: JSON.stringify(spec3), category: '반려동물', budget: 800000, status: 'submitted', createdAt: iso(2) },
  });
  console.log('✓ briefs');

  // ── Events ──
  const evts: [string, Record<string, unknown>, number][] = [
    ['artifact.published', { artifactId: aGame.id, title: aGame.title, by: spaceCreator.username }, 6],
    ['smoke_test.completed', { artifactId: aTravel.id, title: aTravel.title, score: 82 }, 4],
    ['problem_brief.matched', { briefId: b2.id, title: spec2.title, developer: spaceCreator.username }, 12],
    ['artifact.published', { artifactId: aVideo.id, title: aVideo.title, by: motionLab.username }, 9],
    ['prompt.created', { promptId: p8.id, title: p8.title, by: demo.username }, 3],
    ['artifact.published', { artifactId: aLanding.id, title: aLanding.title, by: demo.username }, 8],
    ['marketplace.listed', { artifactId: a3d.id, title: a3d.title }, 7],
    ['artifact.published', { artifactId: aFantasy.id, title: aFantasy.title, by: pixelDreamer.username }, 7],
  ];
  for (const [type, payload, days] of evts) await db.eventLog.create({ data: { type, payload: JSON.stringify(payload), createdAt: iso(days) } });
  console.log('✓ events');

  console.log('── PLAYLAB seed done ──');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
