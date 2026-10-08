// YouTube analysis pipeline. Provider credentials never leave the server.
import { db } from '@/lib/db';
import { chatJson } from '@/lib/server/ai';
import { fetchSocialKitTranscript } from '@/lib/server/socialkit';
export { isTranscriptQualityAcceptable } from '@/lib/server/socialkit';
import type { YoutubeAnalysisDTO, YoutubeChapter } from '@/lib/types';

export { youtubeVideoId as parseYoutubeVideoId } from '@/modules/academy/curriculum';

function asJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function toYoutubeAnalysisDTO(a: {
  id: string; videoId: string; sourceUrl: string; title: string; channelTitle: string; description: string;
  thumbnailUrl: string | null; transcript: string; transcriptLanguage: string | null; transcriptSource: string | null;
  qualityWarning: string | null; category: string | null; summary: string; reportSummary: string;
  chapterJson: string; keywordsJson: string; studyContent: string; commentsSummary: string; contextSummary: string; status: string; error: string | null;
}): YoutubeAnalysisDTO {
  return {
    ...a,
    thumbnailUrl: a.thumbnailUrl,
    transcriptLanguage: a.transcriptLanguage,
    transcriptSource: a.transcriptSource,
    qualityWarning: a.qualityWarning,
    category: a.category,
    chapters: asJson<YoutubeChapter[]>(a.chapterJson, []),
    keywords: asJson<string[]>(a.keywordsJson, []),
    studyContent: a.studyContent,
    status: a.status as YoutubeAnalysisDTO['status'],
    error: a.error,
  };
}

async function fetchOembed(url: string) {
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return {};
  const data = await res.json() as { title?: string; author_name?: string; thumbnail_url?: string };
  return { title: data.title ?? '', channelTitle: data.author_name ?? '', thumbnailUrl: data.thumbnail_url ?? null };
}

async function fetchYoutubeData(videoId: string) {
  const key = process.env.YOUTUBE_DATA_API_KEY;
  if (!key) return { title: '', channelTitle: '', description: '', thumbnailUrl: null as string | null, comments: '' };
  const [videoRes, commentsRes] = await Promise.all([
    fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(key)}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) }).catch(() => null),
    fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}&maxResults=20&order=relevance&key=${encodeURIComponent(key)}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) }).catch(() => null),
  ]);
  const videoData = videoRes?.ok ? await videoRes.json() as { items?: { snippet?: { title?: string; channelTitle?: string; description?: string; thumbnails?: { high?: { url?: string } } } }[] } : {};
  const commentData = commentsRes?.ok ? await commentsRes.json() as { items?: { snippet?: { topLevelComment?: { snippet?: { textDisplay?: string } } } }[] } : {};
  const snippet = videoData.items?.[0]?.snippet;
  return { title: snippet?.title ?? '', channelTitle: snippet?.channelTitle ?? '', description: snippet?.description ?? '', thumbnailUrl: snippet?.thumbnails?.high?.url ?? null, comments: (commentData.items ?? []).map((c) => c.snippet?.topLevelComment?.snippet?.textDisplay ?? '').filter(Boolean).join('\n') };
}

async function makeSummary(input: { title: string; channel: string; description: string; transcript: string; comments: string }) {
  const source = input.transcript;
  if (!process.env.GEMINI_API_KEY?.trim()) throw new Error('GEMINI_API_KEY 미설정');
  return chatJson<{
    category: string; summary: string; reportSummary: string; chapters: YoutubeChapter[];
    keywords: string[]; studyContent: string; commentsSummary: string; contextSummary: string;
  }>(
    `You are an expert educational content designer. Analyze YouTube learning content and create comprehensive study materials in Korean.
Return JSON only. Do not invent facts — only use information present in the transcript/description.`,
    `제목: ${input.title}\n채널: ${input.channel}\n설명: ${input.description}\n자막: ${source.slice(0, 50000)}\n\n` +
      `상위 댓글: ${input.comments.slice(0, 10000)}\n\n` +
      `JSON 형식으로 반환:
{
  "category": "콘텐츠 카테고리 (예: IT/AI 교육, 프로그래밍, 디자인 등)",
  "summary": "핵심 요약 (3-5문장)",
  "reportSummary": "상세 학습 노트 (자막 내용을 체계적으로 정리)",
  "chapters": [{"title": "섹션 제목", "summary": "해당 섹션 요약", "timestamp": "00:00 (있으면)"}],
  "keywords": ["핵심 키워드 5-10개"],
  "studyContent": "## 학습 가이드\\n\\n### 1. 핵심 개념 정리\\n- 영상에서 다루는 핵심 개념을 불릿 포인트로 정리\\n- 각 개념에 대한 간결한 설명 포함\\n\\n### 2. 단계별 학습 내용\\n영상의 흐름을 따라 단계별로 정리. 각 단계마다:\\n- 무엇을 배우는지\\n- 핵심 포인트\\n- 예시나 실습 내용\\n\\n### 3. 실습/적용 포인트\\n- 직접 따라해볼 수 있는 실습 항목\\n- 적용 가능한 팁\\n\\n### 4. 핵심 요약 & 복습 체크리스트\\n- [ ] 체크리스트 형태로 복습 포인트 정리\\n\\n(자막 내용을 기반으로 위 구조에 맞게 상세하게 작성. 마크다운 형식. 최소 1000자 이상.)",
  "commentsSummary": "시청자 반응 요약",
  "contextSummary": "영상 맥락 한 줄 요약"
}`,
  );
}

export async function processYoutubeAnalysis(jobId: string) {
  const job = await db.youtubeAnalysisJob.findUnique({ where: { id: jobId }, include: { analysis: true } });
  if (!job || job.status !== 'queued') return;
  await db.youtubeAnalysisJob.update({ where: { id: job.id }, data: { status: 'running' } });
  await db.youtubeAnalysis.update({ where: { id: job.analysisId }, data: { status: 'running', error: null } });
  try {
    // Persist extraction before optional AI generation. A billing/AI error must
    // never discard a successful SocialKit transcript or hide the video title.
    const transcript = await fetchSocialKitTranscript(job.analysis.videoId);
    await db.youtubeAnalysis.update({ where: { id: job.analysisId }, data: {
      transcript: transcript.text, transcriptSource: transcript.source,
      transcriptLanguage: transcript.language, qualityWarning: null,
    } });
    const [oembed, youtube] = await Promise.all([
      fetchOembed(job.analysis.sourceUrl).catch(() => ({})),
      fetchYoutubeData(job.analysis.videoId),
    ]);
    const metadata = {
      title: youtube.title || ('title' in oembed && oembed.title) || job.analysis.title || job.analysis.videoId,
      channelTitle: youtube.channelTitle || ('channelTitle' in oembed && oembed.channelTitle) || job.analysis.channelTitle,
      description: youtube.description || job.analysis.description,
      thumbnailUrl: youtube.thumbnailUrl || ('thumbnailUrl' in oembed && oembed.thumbnailUrl) || job.analysis.thumbnailUrl,
    };
    await db.youtubeAnalysis.update({ where: { id: job.analysisId }, data: {
      ...metadata,
    } });
    let summary: Awaited<ReturnType<typeof makeSummary>>;
    try {
      summary = await makeSummary({ ...metadata, channel: metadata.channelTitle, transcript: transcript.timed, comments: youtube.comments });
      if (!summary.studyContent?.trim()) throw new Error('Empty study notes');
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      const reason = /402|prepayment|credits are depleted/i.test(message)
        ? 'Gemini 선불 크레딧이 소진되어 학습노트를 만들지 못했습니다. 크레딧 충전 후 다시 생성해주세요.'
        : /GEMINI_API_KEY/.test(message)
          ? 'Gemini API 키가 설정되지 않아 학습노트를 만들지 못했습니다.'
          : 'AI 학습노트 생성에 실패했습니다. 잠시 후 다시 생성해주세요.';
      throw new Error(`SocialKit 자막은 추출·저장했습니다. ${reason}`);
    }
    await db.youtubeAnalysis.update({ where: { id: job.analysisId }, data: {
      category: summary.category, summary: summary.summary, reportSummary: summary.reportSummary,
      chapterJson: JSON.stringify(summary.chapters ?? []), keywordsJson: JSON.stringify(summary.keywords ?? []),
      studyContent: summary.studyContent, commentsSummary: summary.commentsSummary ?? '', contextSummary: summary.contextSummary,
      status: 'done', error: null,
    } });
    await db.youtubeAnalysisJob.update({ where: { id: job.id }, data: { status: 'done', completedAt: new Date() } });
  } catch (e) {
    const error = e instanceof Error ? e.message : '분석에 실패했습니다';
    await db.youtubeAnalysis.update({ where: { id: job.analysisId }, data: { status: 'failed', error } });
    await db.youtubeAnalysisJob.update({ where: { id: job.id }, data: { status: 'failed', error, completedAt: new Date() } });
  }
}
