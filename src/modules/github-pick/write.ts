// AI step: README + video context → a 깃허브 픽 card in COAI's own words (never a copy of the README).
// Server-only; runs from the CRON_SECRET / admin guarded route.
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PickUseCase } from './pick';
import type { RepoInfo } from './sources';

const MODEL = process.env.GITHUB_PICK_GEMINI_MODEL || process.env.INGEST_GEMINI_MODEL || 'gemini-3.6-flash';

const SYSTEM = `너는 COAI(AI를 같이 배우고 써 보는 커뮤니티)의 "깃허브 픽" 에디터다. 유튜브에서 소개된 깃허브 저장소 하나를 읽고, 개발자가 아닌 사람도 이해할 카드 JSON을 만든다.
규칙:
1. 근거는 아래 제공된 저장소 정보·README·영상 제목/설명/자막뿐이다. 없는 기능, 숫자, 가격, 회사 관계를 만들지 않는다.
2. README 문장을 베끼지 말고 쉬운 한국어로 새로 쓴다. 전문용어는 짧게 풀어 쓴다.
3. useful=false: AI·개발·자동화·생산성과 무관하거나, README가 비어 있어 무엇인지 알 수 없거나, 성인·도박·불법 도구·해킹 공격 도구일 때.
   또 독자는 AI를 막 배우는 일반인·1인 창작자·실무자다. 서버 운영자나 머신러닝 엔지니어만 쓰는 인프라(모델 추론·서빙 엔진, 학습·파인튜닝 프레임워크, GPU 커널, 데이터베이스, 쿠버네티스·클러스터 도구, 저수준 라이브러리·SDK)는 useful=false로 하고 reason에 "인프라"라고 쓴다.
   Claude Code·ChatGPT 같은 AI 도구에 붙여 쓰는 플러그인·스킬·MCP, 데스크톱/웹 앱, 한 줄로 설치해 바로 써 보는 CLI, 업무 자동화 도구는 useful=true다.
4. title: 무엇을 해 주는 도구인지 한 줄(40자 이내). 저장소 이름을 앞에 둔다. 예: "claude-mem — 클로드 코드가 어제 작업을 기억하게 해 주는 플러그인"
5. oneLine: 카드 목록용 한 문장(80자 이내).
6. what: 무엇인가를 설명하는 3줄(각 90자 이내).
7. useCases: 정확히 3개. who는 "이런 사람"(20자 이내), how는 구체적으로 어디에 쓰는지(80자 이내).
8. whyNow: 지금 화제인 이유 한두 문장(120자 이내). 제공된 별 수·소개한 채널 수·최근 업데이트만 근거로 쓴다.
9. install: README에 있는 "설치" 명령 한 줄(npx·pip install·brew install·git clone·curl … | sh 등)을 글자 하나 바꾸지 말고 그대로. 테스트·빌드·예제 실행 명령(pnpm check, npm test, python examples/… 등)은 설치 명령이 아니다. 없으면 빈 문자열.
10. prompts: 이 도구를 설치한 뒤 Claude Code 같은 AI에게 바로 시켜 볼 한국어 요청 1~2개(각 100자 이내).
출력은 JSON 하나만: {"useful":bool,"reason":"짧게","title":"","oneLine":"","what":["","",""],"useCases":[{"who":"","how":""}],"whyNow":"","install":"","prompts":[""]}`;

export class AiUnavailableError extends Error {}

// A README line is shown as "설치 한 줄" only when it really installs or launches the tool —
// not a test/lint script or an example file run (e.g. "pnpm check", "python examples/x.py").
const INSTALL_COMMAND = /^(?:sudo\s+)?(?:npx|bunx|pnpm\s+(?:add|dlx|i(?:nstall)?)|npm\s+(?:i|install)|yarn\s+(?:add|global|dlx)|bun\s+(?:add|install)|pipx?\s+install|uvx?\b|uv\s+tool\s+install|brew\s+install|cargo\s+install|go\s+install|gem\s+install|winget\s+install|scoop\s+install|choco\s+install|docker\s+(?:run|pull|compose\s+up)|git\s+clone|claude\s+(?:mcp|plugin)\s+(?:add|install)|\/plugin\s+install|curl\s.*\|\s*(?:ba|z)?sh|wget\s.*\|\s*(?:ba|z)?sh|irm\s.*\|\s*iex|iwr\s.*\|\s*iex)/i;

export function isInstallCommand(line: string) {
  return INSTALL_COMMAND.test(line.trim().replace(/^\$\s*/, ''));
}

export type Written ={ title: string; oneLine: string; what: string[]; useCases: PickUseCase[]; whyNow: string; install: string; prompts: string[] };
export type WriteResult = { ok: true; card: Written } | { ok: false; reason: string };

let client: GoogleGenerativeAI | null = null;

async function callGemini(user: string, key: string) {
  client ??= new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM, generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } });
  return (await model.generateContent(user)).response.text();
}

async function callOpenAI(user: string, key: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ model: process.env.INGEST_OPENAI_MODEL || 'gpt-5.4-mini', response_format: { type: 'json_object' }, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  return ((await res.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? '';
}

const dead = new Set<string>();

/** Gemini first (the paid key this project tops up), OpenAI as fallback. Credit/key failures stop the run instead of retrying. */
async function completeJson(user: string) {
  const providers: [string, string | undefined, (u: string, k: string) => Promise<string>][] = [
    ['gemini', process.env.GEMINI_API_KEY, callGemini],
    ['openai', process.env.OPENAI_API_KEY, callOpenAI],
  ];
  for (const [name, key, call] of providers) {
    if (!key || dead.has(name)) continue;
    try { return await call(user, key); }
    catch (error) {
      const message = (error as Error).message;
      if (/\b(401|402|403|429)\b|Payment Required|credits|quota|RESOURCE_EXHAUSTED/i.test(message)) { dead.add(name); console.warn(`[github-pick] ${name} unavailable`); continue; }
      throw new Error(`${name} 호출 실패`);
    }
  }
  throw new AiUnavailableError('사용 가능한 AI 공급자가 없습니다 (키 없음 또는 크레딧 소진)');
}

const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
// Cards render their own numbering, so a leading "1." / "-" from the model is dropped.
const lines = (value: unknown, count: number, max: number) => (Array.isArray(value) ? value.map((item) => str(item, max + 4).replace(/^(\d+[.)]|[-•*])\s*/, '').slice(0, max)).filter(Boolean).slice(0, count) : []);

export async function writeCard(input: {
  repo: RepoInfo; readme: string; channels: string[];
  videos: { title: string; channel: string; description: string }[]; transcript: string;
}): Promise<WriteResult> {
  const { repo } = input;
  const user = [
    `저장소: ${repo.fullName} (${repo.url})`,
    `설명: ${repo.description || '(없음)'}`,
    `별: ${repo.stars} · 언어: ${repo.language || '-'} · 라이선스: ${repo.license || '표기 없음'} · 최근 업데이트: ${repo.pushedAt.slice(0, 10)} · 주제: ${repo.topics.join(', ') || '-'}`,
    `소개한 채널(${input.channels.length}곳): ${input.channels.join(', ')}`,
    ...input.videos.slice(0, 3).map((video, i) => `영상${i + 1} [${video.channel}] ${video.title}\n${video.description.slice(0, 800)}`),
    input.transcript ? `영상 자막(일부):\n${input.transcript.slice(0, 4000)}` : '',
    `README:\n${input.readme || '(README 없음)'}`,
  ].filter(Boolean).join('\n\n');

  const text = await completeJson(user);
  let raw: Record<string, unknown>;
  try { raw = JSON.parse(text.replace(/^```(?:json)?|```$/gim, '').trim()) as Record<string, unknown>; } catch { return { ok: false, reason: 'json' }; }
  if (!raw.useful) return { ok: false, reason: str(raw.reason, 120) || 'not useful' };

  const title = str(raw.title, 80), oneLine = str(raw.oneLine, 140);
  const what = lines(raw.what, 3, 160);
  const useCases = (Array.isArray(raw.useCases) ? raw.useCases : [])
    .map((item) => ({ who: str((item as PickUseCase)?.who, 40), how: str((item as PickUseCase)?.how, 160) }))
    .filter((item) => item.who && item.how).slice(0, 3);
  if (!title || !oneLine || what.length === 0 || useCases.length === 0) return { ok: false, reason: 'incomplete' };
  // An install command is only shown when it is really in the README (never an AI guess).
  const install = str(raw.install, 200);
  return {
    ok: true,
    card: { title, oneLine, what, useCases, whyNow: str(raw.whyNow, 200), install: install && input.readme.includes(install) && isInstallCommand(install) ? install : '', prompts: lines(raw.prompts, 2, 160) },
  };
}
