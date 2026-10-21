import { TtsProviderError, type TtsProvider } from './types';

// Inactive fallback kept behind TTS_PROVIDER=gemini. Gemini only knows its own
// prebuilt voices, so Qwen speaker ids map onto the closest Gemini voice.
const MODEL = 'gemini-2.5-flash-preview-tts';
const VOICE_MAP: Record<string, string> = {
  Sohee: 'Aoede', Serena: 'Kore', Vivian: 'Zephyr', Ono_Anna: 'Leda', Aiden: 'Puck',
  Ryan: 'Fenrir', Uncle_Fu: 'Charon', Dylan: 'Enceladus', Eric: 'Orus',
};

function pcmToWav(pcm: Buffer, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function failure(status: number, rawMessage = '') {
  console.error(`[tts/gemini] Gemini TTS failed with status ${status}`);
  if (status === 402 || /prepayment|credits are depleted|billing/i.test(rawMessage)) {
    return new TtsProviderError('지금은 AI 음성 서비스를 점검 중이에요. 잠시 후 다시 시도해 주세요.', 503);
  }
  if (status === 429) return new TtsProviderError('요청이 많아 잠시 대기 중이에요. 잠시 후 다시 시도해 주세요.', 429);
  if (status === 400) return new TtsProviderError('이 문장은 음성으로 만들 수 없어요. 내용을 조금 바꿔서 다시 시도해 주세요.', 400);
  return new TtsProviderError('음성 생성에 실패했어요. 잠시 후 다시 시도해 주세요.', 502);
}

export const geminiTts: TtsProvider = {
  id: 'gemini',
  model: MODEL,
  async start(request) {
    if (request.mode === 'design') throw new TtsProviderError('목소리 디자인은 지금 사용할 수 없어요.', 503);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new TtsProviderError('지금은 AI 음성 서비스를 점검 중이에요. 잠시 후 다시 시도해 주세요.', 503);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: request.text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_MAP[request.voice || ''] || 'Kore' } } } },
      }),
    });
    const data = await response.json().catch(() => ({})) as { error?: { message?: string }; candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] };
    if (!response.ok) throw failure(response.status, data.error?.message);
    const audio = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData?.data;
    if (!audio) throw failure(502);
    return { kind: 'done', wav: pcmToWav(Buffer.from(audio, 'base64')) };
  },
  async check() {
    return { status: 'failed', providerStatus: 'UNSUPPORTED' };
  },
  async cancel() {},
};
