// AI step: read one notice page and rewrite it as an AI 일정 entry in COAI's own words.
// Server-only. Runs from the CRON_SECRET / admin guarded route, so it does not use the per-user paid-API gate.
import { GoogleGenerativeAI } from '@google/generative-ai';
import { eventInputSchema, type EventInput } from '@/modules/ai-events/input';
import { koreaDate } from '@/modules/ai-events/catalogue';

const MODEL = process.env.INGEST_GEMINI_MODEL || 'gemini-3.6-flash';
let client: GoogleGenerativeAI | null = null;

const SYSTEM = `너는 COAI(AI 스터디·커뮤니티)의 일정 에디터다. 기관 공지/기사 한 건을 읽고 AI 일정 카드용 JSON을 만든다.
규칙:
1. relevant=true 조건: AI·소프트웨어·ICT·데이터·로봇·디지털·미디어콘텐츠 제작·창업(해커톤 포함)과 직접 관련된 강의/교육, 공모전/해커톤/대회, 행사/세미나/포럼/지원사업 모집. 공연·북토크·일반 축제·복지·사회적경제·봉사·여행·직원/알바/스태프 채용·입찰·용역·결과 발표·행사 후기 기사는 주제가 AI/디지털과 직접 닿지 않으면 false.
2. 오늘(KST) 기준으로 이미 끝났다면(행사 종료·접수 마감 모두 지남) relevant=false.
3. 본문에 없는 사실은 절대 만들지 않는다. 모르면 빈 문자열. 비용·대상·장소·마감일을 추측하지 않는다.
4. summary는 원문을 베끼지 말고 우리 말로 2~3문장(300자 이내)으로 다시 쓴다. subtitle은 한 줄(60자 이내) 요약.
5. 날짜: applyFrom/applyUntil은 YYYY-MM-DD, applyTime은 HH:MM, startsAt/endsAt은 YYYY-MM-DDTHH:MM(한국시간)이며 본문에 시작·종료 "시각"이 적혀 있을 때만 채우고, 시각 없이 날짜만 있으면 비운다(날짜는 schedule에만 쓴다). 연도가 없으면 오늘 기준으로 가장 가까운 미래 연도. 확실하지 않으면 빈 문자열.
6. schedule은 사람이 읽는 일정 한 줄(예: "2026.11.05 · 14:00–17:00"), application은 접수 안내 한 줄(예: "2026.11.05까지 접수"). 없으면 각각 "원문 확인".
7. kind: course(강의·교육·부트캠프), contest(공모전·해커톤·대회·지원사업 공모), event(행사·세미나·포럼·박람회).
8. officialUrl: 본문에 신청/안내 주소가 https:// 로 그대로 적혀 있을 때만 그 주소. 없으면 빈 문자열.
9. tags는 3~5개, 각 12자 이내.
출력은 JSON 하나만: {"relevant":bool,"reason":"짧게","kind":"","title":"","subtitle":"","organizer":"","summary":"","schedule":"","application":"","audience":"","location":"","cost":"","tags":[],"applyFrom":"","applyUntil":"","applyTime":"","startsAt":"","endsAt":"","officialUrl":""}`;

type Raw = Record<string, unknown> & { relevant?: boolean; reason?: string; tags?: unknown; officialUrl?: string };
const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const TOPIC = /\bAI\b|\bA\.I\b|\bSW\b|\bICT\b|\bIT\b|\bIoT\b|AIoT|인공지능|생성형|챗GPT|ChatGPT|클로드|제미나이|LLM|머신러닝|딥러닝|소프트웨어|코딩|프로그래밍|개발자|디지털|데이터|빅데이터|클라우드|로봇|드론|메타버스|블록체인|해커톤|정보화|스마트|테크|정보보호|사이버|웹툰|애니메이션|게임|영상 ?제작|미디어|콘텐츠 ?(창|제작)|창업|스타트업/i;
const THEME ={ course: 'sage', contest: 'sand', event: 'indigo' } as const;

export type Extraction = { ok: true; input: EventInput } | { ok: false; reason: 'irrelevant' | 'ended' | 'invalid'; detail?: string };

/** Thrown when every configured provider refuses to work (no credit / bad key) — the run stops instead of burning retries. */
export class AiUnavailableError extends Error {}

const PROVIDERS = { gemini: () => process.env.GEMINI_API_KEY, openai: () => process.env.OPENAI_API_KEY } as const;
type Provider = keyof typeof PROVIDERS;
const deadProviders = new Set<Provider>();

async function callGemini(user: string, key: string) {
  client ??= new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM, generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } });
  return (await model.generateContent(user)).response.text();
}

async function callOpenAI(user: string, key: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ model: process.env.INGEST_OPENAI_MODEL || 'gpt-5.4-mini', response_format: { type: 'json_object' }, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return ((await res.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? '';
}

async function completeJson(user: string) {
  // OpenAI is the default; Gemini is only tried first when INGEST_AI_PROVIDER=gemini. Either one falls back to the other.
  const preferred = (process.env.INGEST_AI_PROVIDER === 'gemini' ? ['gemini', 'openai'] : ['openai', 'gemini']) as Provider[];
  for (const provider of preferred) {
    const key = PROVIDERS[provider]();
    if (!key || deadProviders.has(provider)) continue;
    try { return provider === 'gemini' ? await callGemini(user, key) : await callOpenAI(user, key); }
    catch (error) {
      if (/\b(401|402|403|429)\b|Payment Required|credits|quota/i.test((error as Error).message)) { deadProviders.add(provider); console.warn(`[event-ingest] ${provider} unavailable:`, (error as Error).message.slice(0, 120)); continue; }
      throw error;
    }
  }
  throw new AiUnavailableError('사용 가능한 AI 공급자가 없습니다 (키 없음 또는 크레딧 소진)');
}

export async function extractEvent(page: { sourceName: string; title: string; url: string; text: string }): Promise<Extraction> {
  const today = koreaDate(new Date());
  const text = await completeJson(`오늘(KST): ${today}\n출처: ${page.sourceName}\n제목: ${page.title}\n주소: ${page.url}\n\n본문:\n${page.text}`);
  let raw: Raw;
  try { raw = JSON.parse(text.replace(/^```(?:json)?|```$/gim, '').trim()) as Raw; } catch { return { ok: false, reason: 'invalid', detail: 'json' }; }
  if (!raw.relevant) return { ok: false, reason: 'irrelevant', detail: str(raw.reason, 120) };

  const kind = raw.kind === 'course' || raw.kind === 'contest' || raw.kind === 'event' ? raw.kind : 'event';
  const official = str(raw.officialUrl, 2000);
  const sourceUrl = official.startsWith('https://') && page.text.includes(official) ? official : page.url.replace(/^http:/, 'https:');
  const base = {
    kind, title: str(raw.title, 100) || page.title.slice(0, 100), subtitle: str(raw.subtitle, 180), organizer: str(raw.organizer, 120) || page.sourceName,
    summary: str(raw.summary, 1200), schedule: str(raw.schedule, 180) || '원문 확인', application: str(raw.application, 180) || '원문 확인',
    audience: str(raw.audience, 200), location: str(raw.location, 200), cost: str(raw.cost, 200), sourceUrl, posterText: '', theme: THEME[kind],
    tags: Array.isArray(raw.tags) ? raw.tags.map((tagValue) => str(tagValue, 12)).filter(Boolean).slice(0, 5).join(', ') : '',
    registrationClosed: false, removePoster: false,
  };
  const dates = { applyFrom: str(raw.applyFrom, 10), applyUntil: str(raw.applyUntil, 10), applyTime: str(raw.applyTime, 5), startsAt: str(raw.startsAt, 16), endsAt: str(raw.endsAt, 16) };
  // A date the model got slightly wrong should not drop the whole entry: retry without any dates.
  const parsed = eventInputSchema.safeParse({ ...base, ...dates });
  const final = parsed.success ? parsed : eventInputSchema.safeParse(base);
  if (!final.success) return { ok: false, reason: 'invalid', detail: final.error.issues[0]?.message };
  const input = final.data;
  // The model's relevance call is not consistent run to run, so the topic is also checked deterministically.
  if (!TOPIC.test([input.title, input.subtitle, input.summary, input.tags, page.title].join(' '))) return { ok: false, reason: 'irrelevant', detail: 'topic keyword gate' };
  const lastDay = [input.endsAt.slice(0, 10), input.startsAt.slice(0, 10), input.applyUntil].filter(Boolean);
  if (lastDay.length > 0 && lastDay.every((day) => day < today)) return { ok: false, reason: 'ended' };
  return { ok: true, input };
}
