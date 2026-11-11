// Stage 2 transcript: Supadata, ported from nextcurator (ssoktube/lib/transcript.ts)
// getTranscriptViaSupadata. Used only when SocialKit fails. Keeps the same
// `[MM:SS] text` segment format and full-text fallback as the SocialKit path.
// Provider bodies are not exposed (they may echo request details).
import { detectTranscriptLang, formatTimestamp } from '@/lib/server/socialkit';

export type SupadataTranscript = { text: string; timed: string; language: 'ko' | 'en' | 'other'; source: 'supadata' };

type SupadataResponse = {
  content?: Array<{ text?: string; offset?: number; duration?: number; lang?: string }> | string;
  lang?: string;
};

/** `lang` asks for a specific track (e.g. 'ko' when SocialKit returned a translated/dubbed track). */
export async function fetchSupadataTranscript(videoId: string, lang?: string): Promise<SupadataTranscript> {
  const key = process.env.SUPADATA_API_KEY?.trim();
  if (!key) throw new Error('Supadata API 키가 설정되지 않았습니다.');
  let response: Response;
  try {
    response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${encodeURIComponent(videoId)}${lang ? `&lang=${encodeURIComponent(lang)}` : ''}`, {
      headers: { 'x-api-key': key }, cache: 'no-store', signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new Error('Supadata 자막 추출 요청이 연결 실패 또는 시간 초과로 중단됐습니다.');
  }
  if (!response.ok) throw new Error(`Supadata 자막 추출 실패 (HTTP ${response.status}).`);
  const body = await response.json().catch(() => null) as SupadataResponse | null;
  let text = '';
  if (Array.isArray(body?.content) && body.content.length > 0) {
    // offset is milliseconds
    text = body.content
      .map((s) => `[${formatTimestamp((s.offset ?? 0) / 1000)}] ${(s.text ?? '').replace(/\n/g, ' ').trim()}`)
      .filter((line) => line.length > 10)
      .join('\n');
  } else if (typeof body?.content === 'string' && body.content.trim().length > 50) {
    text = body.content.trim();
  }
  if (!text) throw new Error('Supadata에서 영상 자막을 반환하지 못했습니다.');
  return { text, timed: text, language: detectTranscriptLang(text), source: 'supadata' };
}
