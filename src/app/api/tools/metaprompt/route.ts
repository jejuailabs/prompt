import { NextRequest, NextResponse } from 'next/server';
import { chatJson } from '@/lib/server/ai';

type Message = { role: 'user' | 'assistant'; content: string };
const domains = '이미지생성 / 영상제작 / 음악생성 / 텍스트카피 / 범용AI';

export async function POST(req: NextRequest) {
  try {
    const { messages, mode } = await req.json() as { messages?: Message[]; mode?: 'question' | 'generate' };
    if (!Array.isArray(messages) || messages.length === 0) return NextResponse.json({ error: '대화를 시작해 주세요.' }, { status: 400 });
    if (messages.length > 20 || messages.some((message) => typeof message.content !== 'string' || message.content.length > 4000)) return NextResponse.json({ error: '대화 입력이 올바르지 않습니다.' }, { status: 400 });
    const history = messages.map((message) => `${message.role === 'assistant' ? 'AI' : '사용자'}: ${message.content}`).join('\n');
    if (mode === 'generate') {
      const result = await chatJson<{ domain: string; finalPrompt: string; reasoning: string }>(
        `당신은 최상급 AI 프롬프트 엔지니어입니다. 아래 대화를 바탕으로 즉시 사용할 상세 프롬프트를 만드세요. 반드시 JSON만 반환하세요. 형식: {"domain":"${domains} 중 하나","finalPrompt":"완성 프롬프트","reasoning":"구성 요약"}. 프롬프트 첫 문장은 해당 분야의 전문 역할 선언으로 시작하고, 사용자가 말하지 않은 제약은 함부로 단정하지 마세요.`,
        history,
      );
      return NextResponse.json(result);
    }
    const result = await chatJson<{ question: string; domain: string; reasoning: string }>(
      `당신은 메타프롬프트 인터뷰어입니다. 대화를 읽고 고품질 AI 프롬프트에 가장 필요한 질문 딱 하나를 한국어로 질문하세요. JSON만 반환: {"question":"질문","domain":"${domains} 중 하나","reasoning":"짧은 이유"}. 이미 답한 것은 다시 묻지 마세요.`,
      history,
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '메타프롬프트 생성에 실패했습니다.' }, { status: 500 });
  }
}
