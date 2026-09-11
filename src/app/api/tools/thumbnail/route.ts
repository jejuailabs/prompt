import { NextRequest, NextResponse } from 'next/server';
import { chatJson } from '@/lib/server/ai';

export async function POST(req: NextRequest) {
  try {
    const { title, description, audience, mood } = await req.json() as { title?: string; description?: string; audience?: string; mood?: string };
    if (!title?.trim() || !description?.trim()) return NextResponse.json({ error: '영상 제목과 내용을 입력해 주세요.' }, { status: 400 });
    const result = await chatJson<{ hook: string; overlayText: string; imagePrompt: string; composition: string; colorDirection: string; avoid: string[] }>(
      '당신은 클릭률 최적화 전문 유튜브 썸네일 디렉터입니다. 과장·오해를 유발하지 않는 범위에서 클릭을 유도하는 썸네일 기획을 만드세요. 반드시 JSON만 반환하세요: {"hook":"핵심 클릭 이유","overlayText":"한국어 2~6단어","imagePrompt":"이미지 생성용 상세 영어 프롬프트, 글자는 포함하지 않음","composition":"구도","colorDirection":"색상","avoid":["피할 요소"]}.',
      `제목: ${title}\n내용: ${description}\n시청자: ${audience || '일반 시청자'}\n무드: ${mood || '콘텐츠에 적합하게 판단'}`,
    );
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '썸네일 기획 생성에 실패했습니다.' }, { status: 500 }); }
}
