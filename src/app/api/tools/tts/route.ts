import { NextRequest, NextResponse } from 'next/server';

const MODEL = 'gemini-2.5-flash-preview-tts';
const VOICES = new Set(['Charon', 'Fenrir', 'Puck', 'Orus', 'Enceladus', 'Kore', 'Aoede', 'Leda', 'Zephyr', 'Callirrhoe']);

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'TTS를 사용하려면 GEMINI_API_KEY가 필요합니다.' }, { status: 503 });
  try {
    const body = await req.json() as { text?: string; voice?: string };
    const text = body.text?.trim() || '';
    if (!text) return NextResponse.json({ error: '읽을 텍스트를 입력해 주세요.' }, { status: 400 });
    if (text.length > 10_000) return NextResponse.json({ error: '텍스트는 10,000자까지 입력할 수 있습니다.' }, { status: 400 });
    if (!body.voice || !VOICES.has(body.voice)) return NextResponse.json({ error: '유효하지 않은 음성입니다.' }, { status: 400 });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: body.voice } } } },
      }),
    });
    const data = await response.json() as { error?: { message?: string }; candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[] };
    if (!response.ok) return NextResponse.json({ error: data.error?.message || 'Gemini TTS 생성에 실패했습니다.' }, { status: response.status });
    const audio = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
    if (!audio?.data) return NextResponse.json({ error: 'Gemini에서 오디오를 받지 못했습니다.' }, { status: 502 });
    return NextResponse.json({ audioBase64: audio.data, mimeType: audio.mimeType || 'audio/L16;rate=24000' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'TTS 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
