// Korean transcript for a lesson video. GET reads the cached translation;
// POST makes it for lessons analysed before translation existed (paid AI call,
// so it goes through the same API-access gate as other generation).
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireApiUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { getKoreanTranscript, translateTranscriptToKorean } from '@/lib/server/youtube-analysis';

export const maxDuration = 300;

async function lessonTranscript(videoId: string) {
  if (!/^[\w-]{11}$/.test(videoId)) throw new HttpError('잘못된 영상입니다.', 400);
  const analysis = await db.youtubeAnalysis.findUnique({ where: { videoId }, select: { transcript: true, transcriptLanguage: true, academyVideos: { where: { playlist: { published: true } }, select: { id: true }, take: 1 } } });
  if (!analysis?.academyVideos.length) throw new HttpError('강의 영상을 찾을 수 없어요.', 404);
  return analysis;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  try {
    const { videoId } = await params;
    const analysis = await lessonTranscript(videoId);
    return ok({ language: analysis.transcriptLanguage, ko: analysis.transcriptLanguage === 'ko' ? analysis.transcript : await getKoreanTranscript(videoId) });
  } catch (e) { return fail(e); }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  try {
    await requireApiUser();
    const { videoId } = await params;
    const analysis = await lessonTranscript(videoId);
    if (!analysis.transcript.trim()) throw new HttpError('번역할 자막이 아직 없어요.', 409);
    if (analysis.transcriptLanguage === 'ko') return ok({ language: 'ko', ko: analysis.transcript });
    const cached = await getKoreanTranscript(videoId);
    if (cached) return ok({ language: analysis.transcriptLanguage, ko: cached });
    try {
      return ok({ language: analysis.transcriptLanguage, ko: await translateTranscriptToKorean(videoId, analysis.transcript) });
    } catch (e) {
      if (e instanceof HttpError) throw e;
      // Provider messages stay on the server.
      throw new HttpError('자막 번역에 실패했어요. 잠시 후 다시 시도해주세요.', 502);
    }
  } catch (e) { return fail(e); }
}
