// POST /api/lab/improve-prompt — LLM rewrite of a user prompt (keeps input language)
import { NextRequest } from 'next/server';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { chatText } from '@/lib/server/ai';

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await readJson<{ text?: string }>(req);
    const text = (body.text ?? '').trim();
    if (!text) throw new HttpError('개선할 프롬프트를 입력해주세요', 400);

    try {
      const improved = await chatText(
        '당신은 프롬프트 엔지니어링 전문가입니다. 사용자 프롬프트를 개선해 더 구조화하고 구체적으로 만듭니다. 원래 언어를 유지하고 개선된 프롬프트 본문만 출력합니다.',
        text,
      );
      return ok({ improved: improved.trim() || text });
    } catch {
      // LLM unavailable → return the original so the UI keeps working
      return ok({ improved: text });
    }
  } catch (e) {
    return fail(e);
  }
}
