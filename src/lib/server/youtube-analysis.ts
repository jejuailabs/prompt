// YouTube analysis pipeline. Provider credentials never leave the server.
import { db } from '@/lib/db';
import { chatJson, chatText } from '@/lib/server/ai';
import { detectTranscriptLang, fetchSocialKitTranscript } from '@/lib/server/socialkit';
import { fetchSupadataTranscript } from '@/lib/server/supadata';
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

// The academy shows this note as a lecture: an outline, then one section per
// part of the video with its [MM:SS] start so learners can jump to the scene.
// The whole transcript is sent (up to the model's comfortable context) so the
// note covers the full video instead of the first part.
const NOTE_TRANSCRIPT_LIMIT = 150_000;

async function makeSummary(input: { title: string; channel: string; description: string; transcript: string; comments: string }) {
  const source = input.transcript;
  if (!process.env.GEMINI_API_KEY?.trim()) throw new Error('GEMINI_API_KEY 미설정');
  return chatJson<{
    category: string; summary: string; reportSummary: string; chapters: YoutubeChapter[];
    keywords: string[]; studyContent: string; commentsSummary: string; contextSummary: string;
  }>(
    `You are an expert instructor who turns YouTube videos into a Korean lecture that a learner can follow from start to finish.
The transcript may be in English or another language — always write every output field in natural Korean (keep product names, commands and code as-is).
Return JSON only. Do not invent facts — only use information present in the transcript/description.`,
    `제목: ${input.title}
채널: ${input.channel}
설명: ${input.description}
전체 자막([MM:SS] 시간 포함):
${source.slice(0, NOTE_TRANSCRIPT_LIMIT)}

` +
      `상위 댓글: ${input.comments.slice(0, 10000)}

` +
      `JSON 형식으로 반환:
{
  "category": "콘텐츠 카테고리 (예: IT/AI 교육, 프로그래밍, 디자인 등)",
  "summary": "핵심 요약 (3-5문장)",
  "reportSummary": "상세 학습 노트 (자막 내용을 체계적으로 정리)",
  "chapters": [{"title": "섹션 제목", "summary": "해당 섹션 요약", "timestamp": "MM:SS (자막의 실제 시작 시간)"}],
  "keywords": ["핵심 키워드 5-10개"],
  "studyContent": "강의 노트 (아래 규칙)",
  "commentsSummary": "시청자 반응 요약",
  "contextSummary": "영상 맥락 한 줄 요약"
}

studyContent 작성 규칙 — 전체 자막을 처음부터 끝까지 빠짐없이 다루는 '강의 노트'를 마크다운으로 작성:
## 강의 소개
- **이 강의에서 배우는 것**: 학습 목표 3-5개 불릿
- **이런 분께 추천**: 1-2줄
- **준비물**: 영상에 나온 도구·서비스 (없으면 생략)

## 강의 목차
1. 각 강의 파트 제목 [MM:SS] 형식으로 번호 목록

그 다음 영상 흐름을 따라 파트마다:
## 1강. 파트 제목 [MM:SS]
강사가 설명하듯 자연스러운 한국어 문단 2-4개로 이 구간 내용을 풀어서 설명 (자막의 예시·숫자·고유명사 유지)
> 💡 **핵심 포인트**: 이 구간에서 꼭 기억할 한 줄
- 따라하기 단계나 세부 항목이 있으면 번호 목록으로
(파트는 영상 길이에 맞춰 4-10개, 각 파트 제목 끝의 [MM:SS]는 자막에 있는 실제 시작 시간)

## 정리
- 강의 전체 핵심을 5개 이내 불릿으로

## 실습 과제
- 직접 해볼 과제 2-3개

## 복습 퀴즈
1. 질문 (3-5문항) — 각 문항 아래 줄에 "**정답**: ..." 형태로 답

최소 2000자 이상, 마크다운 형식. 원문이 영어여도 한국어로 작성.`,
  );
}

// ── Korean transcript ──
// Extraction keeps the original-language transcript (reference pipeline: no
// translation at extraction). For non-Korean videos a Korean version is made
// afterwards and cached in Setting so the transcript tab can show both.
const KO_TRANSCRIPT_KEY = (videoId: string) => `youtube-transcript-ko:${videoId}`;
const TRANSLATE_CHUNK = 6_000;

export async function getKoreanTranscript(videoId: string): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key: KO_TRANSCRIPT_KEY(videoId) } });
  return row?.value || null;
}

export async function translateTranscriptToKorean(videoId: string, transcript: string): Promise<string> {
  const lines = transcript.split('\n').filter((l) => l.trim());
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if (current && current.length + line.length > TRANSLATE_CHUNK) { chunks.push(current); current = ''; }
    current += (current ? '\n' : '') + line;
  }
  if (current) chunks.push(current);
  const translated: string[] = new Array(chunks.length);
  // Small concurrency keeps long lectures fast without tripping rate limits.
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, chunks.length) }, async () => {
    while (next < chunks.length) {
      const i = next++;
      const out = await chatText(
        'You translate video transcripts into natural, easy Korean. Keep every [MM:SS] timestamp exactly as given at the start of its line, one output line per input line, same order. Keep product names, commands and code unchanged. Output only the translated lines.',
        chunks[i],
      );
      translated[i] = out.replace(/^```\w*\s*|```\s*$/g, '').trim();
    }
  }));
  const text = translated.join('\n').trim();
  if (!text) throw new Error('자막 번역 결과가 비어 있습니다.');
  await db.setting.upsert({ where: { key: KO_TRANSCRIPT_KEY(videoId) }, create: { key: KO_TRANSCRIPT_KEY(videoId), value: text }, update: { value: text } });
  return text;
}

export async function processYoutubeAnalysis(jobId: string) {
  const job = await db.youtubeAnalysisJob.findUnique({ where: { id: jobId }, include: { analysis: true } });
  if (!job || job.status !== 'queued') return;
  await db.youtubeAnalysisJob.update({ where: { id: job.id }, data: { status: 'running' } });
  await db.youtubeAnalysis.update({ where: { id: job.analysisId }, data: { status: 'running', error: null } });
  try {
    // Save title/thumbnail first so a transcript failure never leaves the lesson
    // titled "YouTube 영상 <id>".
    const [oembed, youtube] = await Promise.all([
      fetchOembed(job.analysis.sourceUrl).catch(() => ({})),
      fetchYoutubeData(job.analysis.videoId).catch(() => ({ title: '', channelTitle: '', description: '', thumbnailUrl: null as string | null, comments: '' })),
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
    // Persist extraction before optional AI generation. A billing/AI error must
    // never discard a successful transcript. Same order as the reference
    // pipeline: 1) SocialKit  2) Supadata.
    let transcript: { text: string; timed: string; language: string; source: string };
    try {
      transcript = await fetchSocialKitTranscript(job.analysis.videoId);
    } catch (socialKitError) {
      const socialKitMessage = socialKitError instanceof Error ? socialKitError.message : 'SocialKit 자막 추출 실패';
      try {
        transcript = await fetchSupadataTranscript(job.analysis.videoId);
      } catch (supadataError) {
        const supadataMessage = supadataError instanceof Error ? supadataError.message : 'Supadata 자막 추출 실패';
        throw new Error(`${socialKitMessage} / 2단계 ${supadataMessage}`);
      }
    }
    // SocialKit has no language option and can return a YouTube auto-dubbed /
    // translated track (e.g. English for a Korean lecture). When the video's own
    // title/description is Korean but the transcript is not, ask Supadata for the
    // Korean track and keep SocialKit's result if that fails.
    if (transcript.language !== 'ko' && detectTranscriptLang(`${metadata.title} ${metadata.description}`) === 'ko') {
      const korean = await fetchSupadataTranscript(job.analysis.videoId, 'ko').catch(() => null);
      if (korean?.language === 'ko') transcript = korean;
    }
    await db.youtubeAnalysis.update({ where: { id: job.analysisId }, data: {
      transcript: transcript.text, transcriptSource: transcript.source,
      transcriptLanguage: transcript.language, qualityWarning: null,
    } });
    // Korean transcript runs beside the note; its failure never fails the lesson.
    const translation = transcript.language === 'ko'
      ? Promise.resolve()
      : translateTranscriptToKorean(job.analysis.videoId, transcript.text).then(() => undefined, () => undefined);
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
      await translation;
      throw new Error(`${transcript.source === 'socialkit' ? 'SocialKit' : 'Supadata'} 자막은 추출·저장했습니다. ${reason}`);
    }
    await translation;
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
