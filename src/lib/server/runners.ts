// Fire-and-forget async runners: lab generation jobs, pipeline executions, smoke test completion
import { db } from '@/lib/db';
import { logEvent } from '@/lib/events';
import { refundCredits } from '@/lib/server/credits';
import { chatJson, generateImage } from '@/lib/server/ai';
import { getImageAdapter, parseAdapterConfig } from '@/lib/server/image-adapters';
import { gameCoverUrl, isHexColor, renderGameHtml, writeGameBundle } from '@/lib/server/game-template';
import { uploadBuffer } from '@/lib/server/storage';
import type { LandingContent } from '@/lib/types';

const SIZE_BY_ASPECT: Record<string, '1024x1024' | '1344x768' | '768x1344'> = {
  '1:1': '1024x1024',
  '16:9': '1344x768',
  '9:16': '768x1344',
};

async function savePng(jobKey: string, buffer: Buffer, sub: string): Promise<string> {
  const filename = `${sub}/${jobKey}.png`;
  return uploadBuffer(filename, buffer, 'image/png');
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message.slice(0, 300);
  return '알 수 없는 오류가 발생했습니다';
}

// ────────────────────────────── Model Lab job runner ──────────────────────────────

export async function processGenerationJobs(jobIds: string[]): Promise<void> {
  await Promise.all(jobIds.map((id) => processGenerationJob(id).catch((e) => console.error('[lab-job]', id, e))));
}

async function processGenerationJob(jobId: string): Promise<void> {
  const job = await db.generationJob.findUnique({
    where: { id: jobId },
    include: { provider: true },
  });
  if (!job) return;
  try {
    await db.generationJob.update({ where: { id: job.id }, data: { status: 'running' } });

    const promptParts = [job.promptText];
    if (job.style) promptParts.push(job.style);
    if (job.provider.styleHint) promptParts.push(job.provider.styleHint);
    const size = SIZE_BY_ASPECT[job.aspect] ?? '1024x1024';

    const adapter = getImageAdapter((job.provider as Record<string, unknown>).adapterType as string ?? 'default');
    const config = parseAdapterConfig((job.provider as Record<string, unknown>).adapterConfig as string ?? '{}');
    const { buffer } = await adapter.generate(promptParts.join(', '), size, config);
    const fileUrl = await savePng(job.id, buffer, 'gen');

    const artifact = await db.artifact.create({
      data: {
        ownerId: job.userId,
        type: 'image',
        title: job.promptText.trim().slice(0, 40) || '모델 실험 결과',
        description: `${job.provider.displayName} 생성 결과`,
        sourcePromptId: job.promptId,
        sourceModule: 'model-lab',
        fileUrl,
        metadata: JSON.stringify({
          model: job.provider.displayName,
          params: { aspect: job.aspect, style: job.style ?? undefined },
          tags: [],
        }),
        status: 'draft',
        visibility: 'public',
      },
    });

    await db.generationJob.update({
      where: { id: job.id },
      data: { status: 'done', resultArtifactId: artifact.id, completedAt: new Date() },
    });
    await logEvent('artifact.created', {
      artifactId: artifact.id,
      ownerId: job.userId,
      sourceModule: 'model-lab',
    });
  } catch (e) {
    await db.generationJob
      .update({
        where: { id: job.id },
        data: { status: 'failed', error: errorMessage(e), completedAt: new Date() },
      })
      .catch(() => undefined);
    // Refund this job's charge
    await refundCredits(job.userId, job.creditCharged, job.id).catch(() => undefined);
  }
}

// ────────────────────────────── Pipeline runners ──────────────────────────────

export function startPipelineRun(runId: string): void {
  void executePipelineRun(runId).catch((e) => console.error('[pipeline-run]', runId, e));
}

interface GameSpec {
  title: string;
  description: string;
  palette: string;
  speed: number;
}

async function executePipelineRun(runId: string): Promise<void> {
  const run = await db.pipelineRun.findUnique({
    where: { id: runId },
    include: { pipeline: true },
  });
  if (!run) return;
  const input = safeParse(run.inputPayload);
  const setProgress = async (p: number): Promise<void> => {
    try {
      await db.pipelineRun.update({ where: { id: run.id }, data: { progress: p } });
    } catch {
      /* progress update is best-effort */
    }
  };

  try {
    const artifactData = await buildPipelineArtifact(run.pipelineId, run.userId, input, setProgress, run.id);
    const artifact = await db.artifact.create({
      data: { ...artifactData, status: 'draft', visibility: 'public' },
    });
    await db.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: 'done',
        progress: 100,
        resultArtifactId: artifact.id,
        completedAt: new Date(),
        error: null,
      },
    });
    await logEvent('artifact.created', {
      artifactId: artifact.id,
      ownerId: run.userId,
      sourceModule: 'pipeline-hub',
      pipelineId: run.pipelineId,
    });
  } catch (e) {
    await db.pipelineRun
      .update({
        where: { id: run.id },
        data: { status: 'failed', error: errorMessage(e), completedAt: new Date() },
      })
      .catch(() => undefined);
    await refundCredits(run.userId, run.creditCharged, run.id).catch(() => undefined);
  }
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

async function buildPipelineArtifact(
  pipelineId: string,
  userId: string,
  input: Record<string, unknown>,
  setProgress: (p: number) => Promise<void>,
  runId: string,
): Promise<PrismaLikeArtifactCreate> {
  switch (pipelineId) {
    case 'pipeline-3d':
      return run3dPipeline(userId, input, setProgress, runId);
    case 'pipeline-shortform':
      return runShortformPipeline(userId, input, setProgress, runId);
    case 'pipeline-detailpage':
      return runDetailpagePipeline(userId, input, setProgress);
    case 'pipeline-game':
      return runGamePipeline(userId, input, setProgress, runId);
    case 'pipeline-copy':
      return runCopyPipeline(userId, input, setProgress);
    default:
      throw new Error(`지원하지 않는 파이프라인입니다: ${pipelineId}`);
  }
}

// Minimal structural type to keep the artifact create data loosely typed
type PrismaLikeArtifactCreate = {
  ownerId: string;
  type: string;
  title: string;
  description?: string;
  sourceModule?: string;
  fileUrl?: string | null;
  contentUrl?: string | null;
  executionTier?: string | null;
  metadata: string;
};

// ── pipeline-3d ──
async function run3dPipeline(
  userId: string,
  input: Record<string, unknown>,
  setProgress: (p: number) => Promise<void>,
  runId: string,
): Promise<PrismaLikeArtifactCreate> {
  const productName = str(input.productName, '3D 에셋');
  const stylePrompt = str(input.stylePrompt, 'violet neon, futuristic');
  await setProgress(30);
  const { buffer } = await generateImage(
    `${productName}, ${stylePrompt}, 3d render, product visualization, studio lighting, high detail`,
    '1024x1024',
  );
  const fileUrl = await savePng(`${runId}-3d`, buffer, 'gen');
  await setProgress(85);
  return {
    ownerId: userId,
    type: '3d_asset',
    title: productName.slice(0, 60),
    description: stylePrompt,
    sourceModule: 'pipeline-hub',
    fileUrl,
    executionTier: null,
    metadata: JSON.stringify({ previewUrl: fileUrl, tags: [productName] }),
  };
}

// ── pipeline-shortform ──
interface SceneSpec {
  caption: string;
  imagePrompt: string;
}

async function runShortformPipeline(
  userId: string,
  input: Record<string, unknown>,
  setProgress: (p: number) => Promise<void>,
  runId: string,
): Promise<PrismaLikeArtifactCreate> {
  const topic = str(input.topic, 'AI 크리에이터의 하루');
  const tone = str(input.tone, '경쾌한');
  const seconds = Math.round(num(input.seconds, 15));
  await setProgress(20);

  let scenes: SceneSpec[];
  try {
    const spec = await chatJson<{ scenes?: SceneSpec[] }>(
      '당신은 숏폼 영상 크리에이터입니다. 주제/톤/길이를 바탕으로 3개 장면의 스토리보드를 만듭니다. 한국어로 작성하고 JSON만 출력합니다. 형식: {"scenes":[{"caption":"장면 자막","imagePrompt":"영문 이미지 생성 프롬프트"}]} — 정확히 3개 장면.',
      `주제: ${topic}\n톤: ${tone}\n길이: ${seconds}초`,
    );
    scenes = (spec.scenes ?? []).filter((s) => s && typeof s.caption === 'string').slice(0, 3);
  } catch {
    scenes = [];
  }
  if (scenes.length < 3) {
    const fallback: SceneSpec[] = [
      { caption: `${topic} — 시작`, imagePrompt: `${topic}, opening scene, cinematic, violet neon lighting` },
      { caption: `${topic} — 전개`, imagePrompt: `${topic}, middle scene, dynamic angle, ${tone} mood` },
      { caption: `${topic} — 마무리`, imagePrompt: `${topic}, closing scene, memorable ending, purple glow` },
    ];
    scenes = [...scenes, ...fallback].slice(0, 3);
  }

  await setProgress(35);
  const frames: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const { buffer } = await generateImage(
      `${scenes[i].imagePrompt}, vertical shortform video frame, high quality`,
      '768x1344',
    );
    frames.push(await savePng(`${runId}-f${i + 1}`, buffer, 'gen'));
  }
  await setProgress(90);

  return {
    ownerId: userId,
    type: 'video',
    title: topic.slice(0, 60),
    description: scenes.map((s, i) => `${i + 1}. ${s.caption}`).join('\n'),
    sourceModule: 'pipeline-hub',
    fileUrl: frames[0],
    executionTier: null,
    metadata: JSON.stringify({
      frames,
      duration: `0:${seconds}`,
      categoryLabel: '숏폼',
      tags: [tone].filter(Boolean),
    }),
  };
}

// ── pipeline-detailpage ──
async function runDetailpagePipeline(
  userId: string,
  input: Record<string, unknown>,
  setProgress: (p: number) => Promise<void>,
): Promise<PrismaLikeArtifactCreate> {
  const productName = str(input.productName, '신제품');
  const price = num(input.price, 0);
  const features = Array.isArray(input.features) ? input.features.map(String).filter(Boolean) : [];
  await setProgress(35);

  let content: LandingContent;
  try {
    content = await chatJson<LandingContent>(
      '당신은 이커머스 상세페이지 카피라이터입니다. 상품 정보를 바탕으로 상세페이지 콘텐츠를 만듭니다. 한국어로 작성하고 JSON만 출력합니다. 형식: {"hero":{"title","subtitle","cta"},"sections":[{"title","body","bullets":["..."]}],"faq":[{"q","a"}],"footer":"..."}. sections는 3~4개.',
      `상품명: ${productName}\n가격: ${price}원\n특징: ${features.join(', ') || '없음'}`,
    );
  } catch {
    content = {
      hero: { title: productName, subtitle: features[0] ?? '지금 바로 만나보세요', cta: '구매하기' },
      sections: (features.length ? features : ['뛰어난 품질', '합리적인 가격', '빠른 배송']).map((f) => ({
        title: f,
        body: `${productName}의 ${f} 특징을 소개합니다.`,
        bullets: [],
      })),
      faq: [],
      footer: `© PLAYLAB DEMO · ${productName}`,
    };
  }
  if (!content.hero) content.hero = { title: productName, subtitle: '', cta: '구매하기' };
  if (!Array.isArray(content.sections)) content.sections = [];
  if (!content.footer) content.footer = `© PLAYLAB DEMO · ${productName}`;
  await setProgress(90);

  return {
    ownerId: userId,
    type: 'landing_page',
    title: `${productName} 상세페이지`.slice(0, 60),
    description: content.hero.subtitle || content.hero.title,
    sourceModule: 'pipeline-hub',
    executionTier: null,
    metadata: JSON.stringify({ content, categoryLabel: '상세페이지' }),
  };
}

// ── pipeline-game ──
async function runGamePipeline(
  userId: string,
  input: Record<string, unknown>,
  setProgress: (p: number) => Promise<void>,
  runId: string,
): Promise<PrismaLikeArtifactCreate> {
  const genre = str(input.genre, '아케이드');
  const theme = str(input.theme, '우주');
  const difficulty = str(input.difficulty, '보통');
  await setProgress(25);

  let spec: Partial<GameSpec> = {};
  try {
    spec = await chatJson<Partial<GameSpec>>(
      '당신은 게임 기획자입니다. 레트로 스페이스 슈터 게임의 컨셉을 정합니다. 한국어로 작성하고 JSON만 출력합니다. 형식: {"title":"게임 제목","description":"한 줄 설명","palette":"#RRGGBB 형식의 메인 컬러","speed":1~5 사이 숫자}',
      `장르: ${genre}\n테마: ${theme}\n난이도: ${difficulty}`,
    );
  } catch {
    spec = {};
  }
  const gameSpec: GameSpec = {
    title: str(spec.title, `${theme} 슈팅`).slice(0, 30),
    description: str(spec.description, `${genre} 장르의 ${theme} 테마 슈팅 게임 (${difficulty})`),
    palette: isHexColor(spec.palette) ? spec.palette : '#a78bfa',
    speed: Math.min(5, Math.max(1, Math.round(num(spec.speed, 3)))),
  };

  await setProgress(55);
  const html = renderGameHtml(gameSpec.title, gameSpec.palette, gameSpec.speed);
  const contentUrl = await writeGameBundle(runId, html);
  await setProgress(90);

  return {
    ownerId: userId,
    type: 'game',
    title: gameSpec.title,
    description: gameSpec.description,
    sourceModule: 'pipeline-hub',
    fileUrl: gameCoverUrl(),
    contentUrl,
    executionTier: 'iframe',
    metadata: JSON.stringify({
      tags: [genre, theme].filter(Boolean),
      categoryLabel: '게임',
      params: { speed: gameSpec.speed, palette: gameSpec.palette },
    }),
  };
}

// ── pipeline-copy ──
interface CopyVariant {
  headline: string;
  body: string;
  cta: string;
}

async function runCopyPipeline(
  userId: string,
  input: Record<string, unknown>,
  setProgress: (p: number) => Promise<void>,
): Promise<PrismaLikeArtifactCreate> {
  const product = str(input.product, '우리 제품');
  const audience = str(input.audience, '일반 소비자');
  const tone = str(input.tone, '친근한');
  await setProgress(35);

  let variants: CopyVariant[];
  try {
    const spec = await chatJson<{ variants?: CopyVariant[] }>(
      '당신은 광고 카피라이터입니다. 제품/타깃/톤에 맞는 카피 3안을 만듭니다. 한국어로 작성하고 JSON만 출력합니다. 형식: {"variants":[{"headline":"헤드라인","body":"본문","cta":"행동 유도 문구"}]} — 정확히 3안.',
      `제품: ${product}\n타깃: ${audience}\n톤: ${tone}`,
    );
    variants = (spec.variants ?? []).filter((v) => v && typeof v.headline === 'string').slice(0, 3);
  } catch {
    variants = [];
  }
  if (variants.length < 3) {
    const fallback: CopyVariant[] = [
      { headline: `${product}, ${audience}를 위한 선택`, body: `${tone} 톤으로 ${product}의 핵심 가치를 전합니다.`, cta: '지금 시작하기' },
      { headline: `${product}로 바꾸는 일상`, body: `${audience}에게 딱 맞은 ${tone} 경험을 제안합니다.`, cta: '무료로 체험하기' },
      { headline: `오늘의 추천: ${product}`, body: `${tone} 무드로 완성한 ${product}를 만나보세요.`, cta: '자세히 보기' },
    ];
    variants = [...variants, ...fallback].slice(0, 3);
  }
  await setProgress(90);

  const v0 = variants[0];
  return {
    ownerId: userId,
    type: 'text',
    title: `${product} 카피 3안`.slice(0, 60),
    description: variants.map((v) => v.headline).join(' / '),
    sourceModule: 'pipeline-hub',
    executionTier: null,
    metadata: JSON.stringify({
      content: {
        hero: { title: v0.headline, subtitle: v0.body, cta: v0.cta },
        sections: variants.map((v) => ({ title: v.headline, body: `${v.body}\n\nCTA: ${v.cta}`, bullets: [] })),
      },
      categoryLabel: '카피라이팅',
      tags: [audience, tone].filter(Boolean),
    }),
  };
}

// ────────────────────────────── Smoke test completion ──────────────────────────────

export function scheduleSmokeTestCompletion(smokeTestId: string): void {
  setTimeout(() => {
    void completeSmokeTest(smokeTestId).catch((e) => console.error('[smoke-test]', smokeTestId, e));
  }, 4000);
}

interface MetricsShape {
  impressions: number;
  clicks: number;
  ctr: number;
  signups: number;
  conversions: number;
  cac: number;
  daily: { date: string; visitors: number; signups: number }[];
}

function buildMetrics(budget: number, days: number): MetricsShape {
  const impressions = Math.round(budget / 1.2);
  const clicks = Math.round(impressions * 0.031);
  const ctr = impressions > 0 ? Math.round((clicks / impressions) * 100 * 100) / 100 : 0;
  const signups = Math.round(clicks * 0.22);
  const conversions = Math.round(signups * 0.13);
  const cac = conversions > 0 ? Math.round(budget / conversions) : 0;

  const daily: MetricsShape['daily'] = [];
  const base = days > 0 ? clicks / days : 0;
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getTime() - (days - 1 - i) * 86400000);
    const t = days > 1 ? i / (days - 1) : 1;
    const weight = 0.7 + 0.3 * Math.sin(2 * Math.PI * t - Math.PI / 2) + t * 0.6; // sinusoidal + rising trend
    const visitors = Math.max(1, Math.round(base * weight));
    daily.push({
      date: d.toISOString().slice(0, 10),
      visitors,
      signups: Math.round(visitors * 0.22),
    });
  }
  return { impressions, clicks, ctr, signups, conversions, cac, daily };
}

const CANNED_INSIGHTS = [
  '도입 초기 대비 방문자가 꾸준히 상승하는 추세로, 콘텐츠 훅이 유효하게 작동하고 있습니다.',
  'CTR이 업계 평균(약 2%)을 상회합니다 — 썸네일·카피 조합을 유지하며 예산을 확대할 시점입니다.',
  '가입 전환은 안정적이나 결제 전환 병목이 관찰됩니다 — 온보딩 단계 간소화를 권장합니다.',
  'CAC가 목표 범위 내에 있어 수익성 확보 가능성이 높습니다. 2주차 추가 캠페인 운영을 제안합니다.',
];

async function completeSmokeTest(smokeTestId: string): Promise<void> {
  const smokeTest = await db.smokeTest.findUnique({ where: { id: smokeTestId } });
  if (!smokeTest || smokeTest.status === 'completed') return;

  const metrics = buildMetrics(smokeTest.budget, smokeTest.days);
  const successScore = Math.min(92, Math.max(60, Math.round(60 + metrics.ctr * 10)));

  // LLM insights with canned fallback
  let recommendation: string[];
  try {
    const res = await chatJson<{ insights?: string[] }>(
      '마케팅 애널리스트로서 스모크테스트 결과의 핵심 인사이트 3-4개를 한국어 불릿으로 작성합니다. JSON만 출력합니다. 형식: {"insights":["...","..."]}',
      JSON.stringify({ budget: smokeTest.budget, days: smokeTest.days, metrics }),
    );
    const insights = (res.insights ?? []).map(String).filter((s) => s.trim().length > 0).slice(0, 4);
    recommendation = insights.length >= 3 ? insights : [...insights, ...CANNED_INSIGHTS].slice(0, 4);
  } catch {
    recommendation = CANNED_INSIGHTS.slice(0, 3);
  }

  await db.$transaction(async (tx) => {
    await tx.smokeTestReport.create({
      data: {
        smokeTestId: smokeTest.id,
        metrics: JSON.stringify(metrics),
        recommendation: JSON.stringify(recommendation),
        successScore,
      },
    });
    await tx.smokeTest.update({
      where: { id: smokeTest.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    if (smokeTest.adCampaignId) {
      await tx.adCampaign.update({
        where: { id: smokeTest.adCampaignId },
        data: { status: 'completed', startAt: new Date(Date.now() - smokeTest.days * 86400000), endAt: new Date() },
      });
    }
  });

  await logEvent('smoke_test.completed', {
    smokeTestId: smokeTest.id,
    artifactId: smokeTest.artifactId,
    successScore,
  });
}
