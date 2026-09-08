// Server-only AI helpers over z-ai-web-dev-sdk (BACKEND ONLY — never import from client code)
import ZAI from 'z-ai-web-dev-sdk';

type ZAIInstance = Awaited<ReturnType<typeof ZAI.create>>;

let cached: ZAIInstance | null = null;

async function getZai(): Promise<ZAIInstance> {
  if (!cached) {
    cached = await ZAI.create();
  }
  return cached;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Plain LLM text completion (thinking disabled). */
export async function chatText(system: string, user: string): Promise<string> {
  const zai = await getZai();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: system },
      { role: 'user', content: user },
    ],
    thinking: { type: 'disabled' },
  });
  return completion.choices[0]?.message?.content ?? '';
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

/**
 * LLM → JSON. Strips markdown fences before JSON.parse; throws on parse failure
 * so callers can apply their own fallbacks.
 */
export async function chatJson<T>(system: string, user: string): Promise<T> {
  const raw = await chatText(system, user);
  const cleaned = stripFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Last resort: slice from first brace/bracket to last matching char
    const start = cleaned.search(/[[{]/);
    if (start >= 0) {
      const open = cleaned[start];
      const close = open === '{' ? '}' : ']';
      const end = cleaned.lastIndexOf(close);
      if (end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1)) as T;
        } catch {
          /* fallthrough */
        }
      }
    }
    throw new Error('AI 응답을 파싱할 수 없습니다');
  }
}

/** Image generation with 2 retries (3 attempts total). */
export async function generateImage(
  prompt: string,
  size: '1024x1024' | '768x1344' | '1344x768' = '1024x1024',
): Promise<{ base64: string; buffer: Buffer }> {
  let lastError: unknown = new Error('이미지 생성에 실패했습니다');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const zai = await getZai();
      const res = await zai.images.generations.create({ prompt, size });
      const b64 = res?.data?.[0]?.base64;
      if (!b64) throw new Error('빈 이미지 응답');
      return { base64: b64, buffer: Buffer.from(b64, 'base64') };
    } catch (e) {
      lastError = e;
      await sleep(1200 * (attempt + 1));
    }
  }
  throw lastError;
}
