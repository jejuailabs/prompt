// Client-safe catalog for the AI Tools TTS. Speakers are the built-in
// Qwen3-TTS 1.7B CustomVoice voices; `native` notes the language each speaker
// sounds most natural in (every speaker can read every supported language).

export type TtsVoice = { id: string; label: string; native: string };
export type TtsStyle = { id: string; label: string; instruct: string };

export const TTS_VOICES: TtsVoice[] = [
  { id: 'Sohee', label: '따뜻한 여성', native: '한국어' },
  { id: 'Serena', label: '부드러운 여성', native: '중국어' },
  { id: 'Vivian', label: '밝은 여성', native: '중국어' },
  { id: 'Ono_Anna', label: '경쾌한 여성', native: '일본어' },
  { id: 'Aiden', label: '시원한 남성', native: '영어' },
  { id: 'Ryan', label: '힘 있는 남성', native: '영어' },
  { id: 'Uncle_Fu', label: '중후한 남성', native: '중국어' },
  { id: 'Dylan', label: '맑은 청년', native: '중국어' },
  { id: 'Eric', label: '허스키한 남성', native: '중국어' },
];

export const TTS_STYLES: TtsStyle[] = [
  { id: 'default', label: '기본', instruct: '' },
  { id: 'calm', label: '차분하게', instruct: 'Speak calmly and slowly with a gentle, reassuring tone.' },
  { id: 'bright', label: '밝고 경쾌하게', instruct: 'Speak in a bright, cheerful and energetic tone.' },
  { id: 'news', label: '뉴스 앵커처럼', instruct: 'Speak like a professional news anchor: clear, confident and neutral.' },
  { id: 'emotional', label: '감정을 담아', instruct: 'Speak expressively with rich emotion, like narrating a story.' },
];

export const TTS_LANGUAGES = [
  { id: 'Korean', label: '한국어' },
  { id: 'English', label: 'English' },
  { id: 'Japanese', label: '日本語' },
  { id: 'Chinese', label: '中文' },
  { id: 'Auto', label: '자동 감지' },
] as const;

export const TTS_MAX_CHARS = 10_000;
export const TTS_DESIGN_MAX_CHARS = 500;

// Starting points for Voice Design; users edit the description freely.
export const TTS_DESIGN_PRESETS = [
  { label: '다큐 내레이터', description: '40대 남성, 낮고 묵직한 저음. 천천히 또박또박, 신뢰감 있는 다큐멘터리 내레이션 톤.' },
  { label: '유튜브 진행자', description: '20대 여성, 밝고 에너지 넘치는 목소리. 빠른 템포에 웃음기가 섞인 친근한 말투.' },
  { label: '동화 구연', description: '30대 여성, 따뜻하고 부드러운 목소리. 아이에게 동화를 읽어주듯 감정을 풍부하게 실어 천천히.' },
  { label: '광고 성우', description: '30대 남성, 맑고 힘 있는 중저음. 자신감 있고 또렷한 광고 내레이션 톤.' },
  { label: '할머니', description: '70대 할머니, 조금 갈라진 따뜻한 목소리. 느리고 정겨운 사투리 섞인 말투.' },
];

export function isTtsVoice(value: unknown): value is string {
  return typeof value === 'string' && TTS_VOICES.some((voice) => voice.id === value);
}
