// Server-only AI helpers over Google Gemini (BACKEND ONLY — never import from client code)
import { GoogleGenerativeAI } from '@google/generative-ai';

let cached: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!cached) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');
    cached = new GoogleGenerativeAI(key);
  }
  return cached;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Plain LLM text completion. */
export async function chatText(system: string, user: string): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: system,
  });
  const result = await model.generateContent(user);
  return result.response.text();
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

/** Image generation via OpenAI API (uses OPENAI_API_KEY). */
export async function generateImage(
  prompt: string,
  size: '1024x1024' | '768x1344' | '1344x768' = '1024x1024',
): Promise<{ base64: string; buffer: Buffer }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다');

  let lastError: unknown = new Error('이미지 생성에 실패했습니다');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size,
          response_format: 'b64_json',
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API ${res.status}: ${err.slice(0, 200)}`);
      }
      const json = await res.json() as { data?: { b64_json?: string }[] };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw new Error('빈 이미지 응답');
      return { base64: b64, buffer: Buffer.from(b64, 'base64') };
    } catch (e) {
      lastError = e;
      await sleep(1200 * (attempt + 1));
    }
  }
  throw lastError;
}
