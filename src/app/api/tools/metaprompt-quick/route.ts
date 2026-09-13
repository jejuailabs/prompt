import { NextRequest, NextResponse } from 'next/server';
import { chatJson } from '@/lib/server/ai';

export async function POST(req: NextRequest) {
  try {
    const { outputType, purpose, description, referenceText, referenceUrl } = await req.json() as {
      outputType: string;
      purpose: string;
      description: string;
      referenceText?: string;
      referenceUrl?: string;
    };

    if (!outputType || !description?.trim()) {
      return NextResponse.json({ error: '결과물 유형과 설명을 입력해 주세요.' }, { status: 400 });
    }
    if (description.length > 5000) {
      return NextResponse.json({ error: '설명이 너무 깁니다.' }, { status: 400 });
    }

    const refPart = [
      referenceText ? `참고 텍스트: ${referenceText.slice(0, 2000)}` : '',
      referenceUrl ? `참고 URL: ${referenceUrl}` : '',
    ].filter(Boolean).join('\n');

    const result = await chatJson<{
      domain: string;
      expertRole: string;
      finalPrompt: string;
      outputCategory: 'image' | 'video' | 'music' | 'text';
      title: string;
    }>(
      `당신은 최상급 AI 프롬프트 엔지니어입니다. 사용자 요청을 바탕으로 즉시 사용 가능한 완성형 프롬프트를 만드세요.

규칙:
1. 프롬프트 첫 문단은 반드시 해당 분야의 전문가 역할 선언으로 시작하세요 (예: "당신은 15년 경력의 브랜드 디자이너입니다...")
2. 결과물 유형과 용도에 맞는 제약사항을 AI가 자동 판단하여 프롬프트에 포함하세요
3. 분야가 특정되면 해당 분야의 전문 용어와 기법을 활용하세요
4. 구체적이고 실행 가능한 지시문으로 구성하세요
5. 결과물에 맞는 포맷과 구조를 지시하세요

반드시 JSON만 반환:
{
  "domain": "감지된 전문 분야 (예: 브랜딩, 의료, 교육, 마케팅 등)",
  "expertRole": "부여한 전문가 역할 한 줄 요약",
  "finalPrompt": "완성 프롬프트 전문",
  "outputCategory": "image | video | music | text 중 하나",
  "title": "이 프롬프트의 짧은 제목 (10자 이내)"
}`,
      `결과물 유형: ${outputType}
용도: ${purpose || '일반'}
사용자 설명: ${description}
${refPart}`.trim(),
    );

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '프롬프트 생성에 실패했습니다.' },
      { status: 500 },
    );
  }
}
