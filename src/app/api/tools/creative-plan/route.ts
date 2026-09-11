import { NextRequest, NextResponse } from 'next/server';
import { chatJson } from '@/lib/server/ai';

export async function POST(req: NextRequest) {
  try {
    const { kind, subject, audience, style, details } = await req.json() as { kind?: 'storyboard' | 'detail' | 'detail2'; subject?: string; audience?: string; style?: string; details?: string };
    if (!kind || !subject?.trim()) return NextResponse.json({ error: '핵심 주제 또는 상품명을 입력해 주세요.' }, { status: 400 });
    const output = kind === 'storyboard'
      ? await chatJson<{ title: string; concept: string; cuts: { no: number; duration: string; scene: string; camera: string; firstFramePrompt: string; videoPrompt: string }[] }>(
        '당신은 광고·영상 스토리보드 감독입니다. JSON만 반환하세요: {"title":"제목","concept":"기획 요약","cuts":[{"no":1,"duration":"0-3초","scene":"장면","camera":"카메라","firstFramePrompt":"영어 이미지 프롬프트","videoPrompt":"영어 영상 프롬프트"}]}. 6~8개 컷으로, 시간 순서와 시각적 전환이 분명해야 합니다.',
        `주제: ${subject}\n타깃: ${audience || '일반'}\n스타일: ${style || '시네마틱'}\n추가: ${details || '없음'}`,
      )
      : await chatJson<{ headline: string; positioning: string; sections: { no: number; title: string; copy: string; imagePrompt: string; goal: string }[] }>(
        `당신은 전환율 중심 이커머스 상세페이지 디렉터입니다. ${kind === 'detail2' ? '12개' : '8개'} 설득 섹션을 JSON만으로 반환하세요: {"headline":"핵심 헤드라인","positioning":"포지셔닝","sections":[{"no":1,"title":"섹션 제목","copy":"2~4문장 카피","imagePrompt":"영어 이미지 생성 프롬프트","goal":"설득 목적"}]}. 과장 광고나 근거 없는 효능은 피하세요.`,
        `상품/서비스: ${subject}\n고객: ${audience || '미정'}\n브랜드 스타일: ${style || '프리미엄·신뢰'}\n상세 정보: ${details || '없음'}`,
      );
    return NextResponse.json(output);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '기획 생성에 실패했습니다.' }, { status: 500 }); }
}
