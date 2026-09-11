// YouTube analysis pipeline. Provider credentials never leave the server.
import { db } from '@/lib/db';
import { chatJson } from '@/lib/server/ai';
import type { YoutubeAnalysisDTO, YoutubeChapter } from '@/lib/types';

export function parseYoutubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0]?.slice(0, 32) ?? null;
    if (url.hostname.endsWith('youtube.com')) {
      return url.searchParams.get('v') ?? url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? null;
    }
  } catch { /* invalid URL */ }
  return null;
}

function asJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function toYoutubeAnalysisDTO(a: {
  id: string; videoId: string; sourceUrl: string; title: string; channelTitle: string; description: string;
  thumbnailUrl: string | null; transcript: string; transcriptLanguage: string | null; transcriptSource: string | null;
  qualityWarning: string | null; category: string | null; summary: string; reportSummary: string;
  chapterJson: string; keywordsJson: string; commentsSummary: string; contextSummary: string; status: string; error: string | null;
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
    status: a.status as YoutubeAnalysisDTO['status'],
    error: a.error,
  };
}

async function fetchOembed(url: string) {
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { cache: 'no-store' });
  if (!res.ok) return {};
  const data = await res.json() as { title?: string; author_name?: string; thumbnail_url?: string };
  return { title: data.title ?? '', channelTitle: data.author_name ?? '', thumbnailUrl: data.thumbnail_url ?? null };
}

async function fetchYoutubeData(videoId: string) {
  const key = process.env.YOUTUBE_DATA_API_KEY;
  if (!key) return { title: '', channelTitle: '', description: '', thumbnailUrl: null as string | null, comments: '' };
  const [videoRes, commentsRes] = await Promise.all([
    fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(key)}`, { cache: 'no-store' }).catch(() => null),
    fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}&maxResults=20&order=relevance&key=${encodeURIComponent(key)}`, { cache: 'no-store' }).catch(() => null),
  ]);
  const videoData = videoRes?.ok ? await videoRes.json() as { items?: { snippet?: { title?: string; channelTitle?: string; description?: string; thumbnails?: { high?: { url?: string } } } }[] } : {};
  const commentData = commentsRes?.ok ? await commentsRes.json() as { items?: { snippet?: { topLevelComment?: { snippet?: { textDisplay?: string } } } }[] } : {};
  const snippet = videoData.items?.[0]?.snippet;
  return { title: snippet?.title ?? '', channelTitle: snippet?.channelTitle ?? '', description: snippet?.description ?? '', thumbnailUrl: snippet?.thumbnails?.high?.url ?? null, comments: (commentData.items ?? []).map((c) => c.snippet?.topLevelComment?.snippet?.textDisplay ?? '').filter(Boolean).join('\n') };
}

async function fetchTranscriptFromProvider(videoId: string): Promise<{ text: string; language?: string; source?: string } | null> {
  // ssoktube-compatible priority: SocialKit → Supadata. Provider response shapes
  // are intentionally normalized here so vendor changes stay isolated.
  const socialKitKey = process.env.SOCIALKIT_API_KEY;
  if (socialKitKey) {
    const res = await fetch(`https://api.socialkit.dev/youtube/transcript?video_id=${encodeURIComponent(videoId)}`, {
      headers: { Authorization: `Bearer ${socialKitKey}` }, cache: 'no-store',
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json() as { transcript?: string; text?: string; language?: string };
      const text = data.transcript ?? data.text ?? '';
      if (isTranscriptQualityAcceptable(text)) return { text, language: data.language, source: 'socialkit' };
    }
  }
  const supadataKey = process.env.SUPADATA_API_KEY;
  if (supadataKey) {
    const res = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${encodeURIComponent(videoId)}`, {
      headers: { 'x-api-key': supadataKey }, cache: 'no-store',
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json() as { transcript?: string; content?: string; language?: string };
      const text = data.transcript ?? data.content ?? '';
      if (isTranscriptQualityAcceptable(text)) return { text, language: data.language, source: 'supadata' };
    }
  }
  // Gemini STT and local youtube-transcript are worker integrations. They are
  // deliberately not invoked in a Vercel request without an audio source/runtime.
  return null;
}

export function isTranscriptQualityAcceptable(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // A transcript must contain enough natural language to be useful. Duration is
  // unavailable in provider fallbacks, so use a conservative absolute floor.
  return words >= 30;
}

async function makeSummary(input: { title: string; channel: string; description: string; transcript: string; comments: string }) {
  const source = input.transcript || `${input.title}\n${input.description}`;
  if (!process.env.GEMINI_API_KEY) {
    return {
      category: 'YouTube', summary: input.description || `${input.title}에 대한 영상입니다.`,
      reportSummary: input.description || '자막을 확보하지 못해 제목 중심으로 정리했습니다.',
      chapters: [] as YoutubeChapter[], keywords: input.title.split(/\s+/).filter(Boolean).slice(0, 5),
      commentsSummary: '', contextSummary: input.description || input.title,
    };
  }
  return chatJson<{
    category: string; summary: string; reportSummary: string; chapters: YoutubeChapter[];
    keywords: string[]; commentsSummary: string; contextSummary: string;
  }>(
    'You summarize Korean/English YouTube learning content. Return JSON only. Do not invent facts.',
    `제목: ${input.title}\n채널: ${input.channel}\n설명: ${input.description}\n자막: ${source.slice(0, 50000)}\n\n` +
      `상위 댓글: ${input.comments.slice(0, 10000)}\n\nJSON {category, summary, reportSummary, chapters:[{title,summary,timestamp?}], keywords, commentsSummary, contextSummary}.`,
  );
}

export async function processYoutubeAnalysis(jobId: string) {
  const job = await db.youtubeAnalysisJob.findUnique({ where: { id: jobId }, include: { analysis: true } });
  if (!job || job.status !== 'queued') return;
  await db.youtubeAnalysisJob.update({ where: { id: job.id }, data: { status: 'running' } });
  await db.youtubeAnalysis.update({ where: { id: job.analysisId }, data: { status: 'running', error: null } });
  try {
    const [oembed, youtube] = await Promise.all([fetchOembed(job.analysis.sourceUrl), fetchYoutubeData(job.analysis.videoId)]);
    const transcript = await fetchTranscriptFromProvider(job.analysis.videoId);
    const summary = await makeSummary({
      title: youtube.title || oembed.title || job.analysis.title || job.analysis.videoId,
      channel: youtube.channelTitle || oembed.channelTitle || job.analysis.channelTitle,
      description: youtube.description || job.analysis.description,
      transcript: transcript?.text ?? '',
      comments: youtube.comments,
    });
    const warning = transcript ? null : '자막을 확보하지 못해 제목·설명 중심으로 요약했습니다. 정확도가 제한될 수 있습니다.';
    await db.youtubeAnalysis.update({ where: { id: job.analysisId }, data: {
      title: youtube.title || oembed.title || job.analysis.title || job.analysis.videoId,
      channelTitle: youtube.channelTitle || oembed.channelTitle || job.analysis.channelTitle,
      description: youtube.description || job.analysis.description,
      thumbnailUrl: youtube.thumbnailUrl || oembed.thumbnailUrl || job.analysis.thumbnailUrl,
      transcript: transcript?.text ?? '', transcriptLanguage: transcript?.language ?? null,
      transcriptSource: transcript?.source ?? null, qualityWarning: warning,
      category: summary.category, summary: summary.summary, reportSummary: summary.reportSummary,
      chapterJson: JSON.stringify(summary.chapters ?? []), keywordsJson: JSON.stringify(summary.keywords ?? []),
      commentsSummary: summary.commentsSummary ?? '', contextSummary: summary.contextSummary,
      status: 'done', error: null,
    } });
    await db.youtubeAnalysisJob.update({ where: { id: job.id }, data: { status: 'done', completedAt: new Date() } });
  } catch (e) {
    const error = e instanceof Error ? e.message : '분석에 실패했습니다';
    await db.youtubeAnalysis.update({ where: { id: job.analysisId }, data: { status: 'failed', error } });
    await db.youtubeAnalysisJob.update({ where: { id: job.id }, data: { status: 'failed', error, completedAt: new Date() } });
  }
}
