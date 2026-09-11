import { NextRequest, NextResponse } from 'next/server';
import { chatJson, chatText } from '@/lib/server/ai';

export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json() as { idea?: string };
    const cleanIdea = idea?.trim() || '';
    if (!cleanIdea) return NextResponse.json({ error: '음악 아이디어를 입력해 주세요.' }, { status: 400 });
    if (cleanIdea.length > 1500) return NextResponse.json({ error: '아이디어는 1,500자까지 입력할 수 있습니다.' }, { status: 400 });
    const korean = /[가-힣]/.test(cleanIdea);
    const [stylePrompt, lyrics, meta] = await Promise.all([
      chatText('당신은 Grammy 수준의 음악 프로듀서입니다. Suno AI Style of Music에 넣을 영어 프롬프트를 900자 이하, 쉼표로 연결된 한 문단으로 작성하세요. 장르, 악기, 리듬, 템포, 보컬, 믹싱, 분위기와 에너지 변화를 구체적으로 포함하고 가사는 쓰지 마세요.', cleanIdea),
      chatText(`당신은 뛰어난 ${korean ? '한국어' : '영어'} 작사가입니다. Suno에 바로 넣을 완전한 오리지널 가사를 작성하세요. [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Final Chorus], [Outro]를 모두 포함하세요.`, cleanIdea),
      chatJson<{ title: string; genre: string; mood: string }>(`아이디어를 바탕으로 노래 제목, 장르, 분위기를 JSON만으로 답하세요: {"title":"2~5단어 제목","genre":"장르","mood":"분위기"}. 제목 언어는 ${korean ? '한국어' : '영어'}입니다.`, cleanIdea),
    ]);
    const trimmedStyle = stylePrompt.length > 1000 ? stylePrompt.slice(0, Math.max(1, stylePrompt.slice(0, 1000).lastIndexOf(','))) : stylePrompt;
    return NextResponse.json({ stylePrompt: trimmedStyle, lyrics, ...meta });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Suno 프롬프트 생성에 실패했습니다.' }, { status: 500 });
  }
}
