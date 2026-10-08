// SocialKit extraction ported from nextcurator (ssoktube/lib/transcript.ts):
// getTranscriptViaSocialKit + detectTranscriptLang. Preserve its segment-first
// format, 8s timeout, full-text fallback, and admin quality-filter bypass.
// Provider errors are sanitized here instead of logging credential-bearing bodies.
export type TranscriptResult = { text: string; timed: string; language: 'ko' | 'en' | 'other'; source: 'socialkit' };

type Segment = { text?: string; start?: number; timestamp?: string };
type TranscriptResponse = {
  success?: boolean;
  data?: { transcript?: string; transcriptSegments?: Segment[] };
};

export function isTranscriptQualityAcceptable(text: string): boolean {
  return text.trim().split(/\s+/).filter(Boolean).length >= 30;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function detectTranscriptLang(text: string): 'ko' | 'en' | 'other' {
  const stripped = text.replace(/\[[^\]]*\]|\d+[:.\s]/g, '').replace(/\s+/g, '');
  if (!stripped) return 'other';
  const korean = (stripped.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  const latin = (stripped.match(/[A-Za-z]/g) || []).length;
  if (korean / stripped.length > 0.15) return 'ko';
  if (latin / stripped.length > 0.4) return 'en';
  return 'other';
}

export async function fetchSocialKitTranscript(videoId: string): Promise<TranscriptResult> {
  const key = process.env.SOCIALKIT_API_KEY?.trim();
  if (!key) throw new Error('SocialKit API 키가 설정되지 않아 자막을 추출하지 못했습니다.');
  let response: Response;
  try {
    response = await fetch(`https://api.socialkit.dev/youtube/transcript?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`, {
      headers: { 'x-access-key': key }, cache: 'no-store', signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new Error('SocialKit 자막 추출 요청이 연결 실패 또는 시간 초과로 중단됐습니다. 다시 시도해주세요.');
  }
  // Do not expose provider bodies: they may echo credentials or request URLs.
  if (!response.ok) throw new Error(`SocialKit 자막 추출 실패 (HTTP ${response.status}). API 키·사용량과 영상 공개 여부를 확인해주세요.`);
  const body = await response.json().catch(() => null) as TranscriptResponse | null;
  if (!body?.success) throw new Error('SocialKit이 영상 자막을 반환하지 못했습니다. 영상 공개 여부와 자막 제공 상태를 확인해주세요.');
  const segments = body.data?.transcriptSegments;
  let text = '';
  if (segments && segments.length > 0) {
    text = segments
      .map(s => `[${formatTimestamp(s.start ?? 0)}] ${(s.text ?? '').replace(/\n/g, ' ').trim()}`)
      .filter(line => line.length > 10)
      .join('\n');
  } else if (body.data?.transcript && body.data.transcript.trim().length > 50) {
    text = body.data.transcript.trim();
  }
  if (!text) throw new Error('SocialKit에서 영상 자막을 반환하지 못했습니다. 영상의 자막 제공 상태를 확인해주세요.');
  return { text, timed: text, language: detectTranscriptLang(text), source: 'socialkit' };
}
