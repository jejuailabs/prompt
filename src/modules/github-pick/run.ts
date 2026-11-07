// Daily 깃허브 픽: whitelisted channel RSS → GitHub repo links → repo facts + README (+ SocialKit transcript)
// → AI card → publish a few per day. Every repo looked at is remembered in a ledger so nothing is paid for twice.
import { db } from '@/lib/db';
import { fetchSocialKitTranscript } from '@/lib/server/socialkit';
import { PICK_CHANNELS } from './channels';
import type { PickContent } from './pick';
import { PICK_LEDGER_MODULE, PICK_MODULE } from './server';
import { channelFeed, repoInfo, repoLinks, repoReadme, type FeedVideo, type RepoInfo } from './sources';
import { AiUnavailableError, writeCard } from './write';

const DAY = 86_400_000;
const MAX_ATTEMPTS = 3;

export type PickRunOptions = { dryRun?: boolean; perDay?: number; maxAi?: number; days?: number };
export type PickItem = { repo: string; channels: string[]; stars?: number; result: 'published' | 'preview' | 'skipped' | 'rejected' | 'error' | 'blocked'; detail?: string; preview?: unknown };
export type PickReport = { dryRun: boolean; channels: Record<string, { videos: number; error?: string }>; candidates: number; aiCalls: number; published: number; aborted?: string; items: PickItem[] };

async function ownerId() {
  const fixed = process.env.INGEST_OWNER_ID?.trim();
  if (fixed) return fixed;
  const admin = await db.profile.findFirst({ where: { role: 'admin' }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (!admin) throw new Error('관리자 프로필을 찾을 수 없습니다 (INGEST_OWNER_ID 설정 필요)');
  return admin.id;
}

const LOCK_MODULE = 'github-pick-lock';
const LOCK_TTL_MS = 6 * 60_000;

async function takeLock(owner: string) {
  const held = await db.artifact.findFirst({ where: { sourceModule: LOCK_MODULE }, select: { id: true, metadata: true } });
  const since = held ? Number((JSON.parse(held.metadata) as { at?: number }).at ?? 0) : 0;
  if (held && Date.now() - since < LOCK_TTL_MS) return null;
  const metadata = JSON.stringify({ at: Date.now() });
  if (held) { await db.artifact.update({ where: { id: held.id }, data: { metadata } }); return held.id; }
  return (await db.artifact.create({ data: { ownerId: owner, type: 'text', sourceModule: LOCK_MODULE, title: 'lock', status: 'hidden', visibility: 'unlisted', metadata } })).id;
}

export async function runGithubPick(options: PickRunOptions = {}): Promise<PickReport> {
  if (options.dryRun) return collect(options);
  const lock = await takeLock(await ownerId());
  if (!lock) return { dryRun: false, channels: {}, candidates: 0, aiCalls: 0, published: 0, aborted: '이미 다른 수집이 실행 중입니다', items: [] };
  try { return await collect(options); }
  finally { await db.artifact.update({ where: { id: lock }, data: { metadata: JSON.stringify({ at: 0 }) } }).catch(() => undefined); }
}

type Candidate = { key: string; repo: string; videos: FeedVideo[]; channels: Set<string>; info?: RepoInfo; score?: number };

const KOREAN_CHANNELS = new Set(PICK_CHANNELS.filter((channel) => channel.lang === 'ko').map((channel) => channel.name));

// Readers are people learning to use AI, not server engineers (2026-11-08 사용자 지시: 대중적인 도구가 메인).
// Tools they can try right away rank up; inference/training/infra projects rank down (the AI step also rejects them).
const EVERYDAY = /claude[- ]?code|chatgpt|gemini|cursor|codex|\bmcp\b|plugin|skill|extension|desktop|app\b|no-?code|automation|workflow|agent|chrome|notion|obsidian|figma|video|image|voice|music|slide|ppt|productivity|vibe/i;
const INFRA = /inference|serving|cuda|kernel|gpu|training|fine-?tun|quantiz|llm[- ]?engine|vllm|tensor|database|\bdb\b|kubernetes|k8s|cluster|compiler|runtime|sdk\b|benchmark|dataset/i;

function audienceBonus(info: RepoInfo) {
  const text = `${info.fullName} ${info.description} ${info.topics.join(' ')}`;
  return (EVERYDAY.test(text) ? 6 : 0) - (INFRA.test(text) ? 8 : 0);
}

/** More channels covering the same repo beats raw stars; tools ordinary users can try, a Korean channel, a recent push and a recent video break ties. */
function score(candidate: Candidate, now: number) {
  const info = candidate.info!;
  const newest = Math.max(...candidate.videos.map((video) => Date.parse(video.publishedAt) || 0));
  const videoAgeDays = (now - newest) / DAY;
  const pushAgeDays = (now - Date.parse(info.pushedAt)) / DAY;
  const korean = [...candidate.channels].some((name) => KOREAN_CHANNELS.has(name)) ? 5 : 0;
  return candidate.channels.size * 10 + korean + audienceBonus(info) +Math.log10(info.stars + 1) * 2 + (pushAgeDays < 14 ? 2 : 0) + Math.max(0, 7 - videoAgeDays) / 2;
}

async function collect(options: PickRunOptions): Promise<PickReport> {
  const dryRun = Boolean(options.dryRun);
  const perDay = options.perDay ?? (Number(process.env.GITHUB_PICK_PER_DAY) || 3);
  const maxAi = options.maxAi ?? perDay * 3;
  const since = Date.now() - (options.days ?? 30) * DAY;
  const report: PickReport = { dryRun, channels: {}, candidates: 0, aiCalls: 0, published: 0, items: [] };
  const owner = dryRun ? '' : await ownerId();

  // 1) recent videos from every whitelisted channel (one failing feed never stops the others)
  const videos: FeedVideo[] = [];
  await Promise.all(PICK_CHANNELS.map(async (channel) => {
    try {
      const feed = (await channelFeed(channel)).filter((video) => (Date.parse(video.publishedAt) || 0) >= since);
      report.channels[channel.name] = { videos: feed.length };
      videos.push(...feed);
    } catch (error) { report.channels[channel.name] = { videos: 0, error: (error as Error).message }; }
  }));

  // 2) group repo links across channels
  const byRepo = new Map<string, Candidate>();
  for (const video of videos) {
    for (const repo of repoLinks(video.description)) {
      const key = repo.toLowerCase();
      const candidate = byRepo.get(key) ?? { key, repo, videos: [], channels: new Set<string>() };
      candidate.videos.push(video);
      candidate.channels.add(video.channel);
      byRepo.set(key, candidate);
    }
  }
  report.candidates = byRepo.size;

  // 3) drop repos the ledger already settled
  const ledger = await db.artifact.findMany({ where: { sourceModule: PICK_LEDGER_MODULE, title: { in: [...byRepo.keys()] } }, select: { id: true, title: true, metadata: true } });
  const known = new Map(ledger.map((row) => { const meta = JSON.parse(row.metadata) as { result?: string; attempts?: number }; return [row.title, { id: row.id, result: meta.result, attempts: meta.attempts ?? 1 }]; }));
  const newest = (candidate: Candidate) => Math.max(...candidate.videos.map((video) => Date.parse(video.publishedAt) || 0));
  // Only the top of this list gets a GitHub lookup, so put repos several channels agree on (then the newest) first.
  const fresh = [...byRepo.values()]
    .filter((candidate) => { const seen = known.get(candidate.key); return !seen || (seen.result === 'error' && seen.attempts < MAX_ATTEMPTS); })
    .sort((a, b) => b.channels.size - a.channels.size || newest(b) - newest(a));

  const remember = async (candidate: Candidate, result: string, extra: Record<string, unknown> = {}) => {
    if (dryRun) return;
    const prior = known.get(candidate.key);
    const metadata = JSON.stringify({ result, attempts: result === 'error' ? (prior?.attempts ?? 0) + 1 : 1, repo: candidate.repo, videos: candidate.videos.map((video) => video.videoId), at: new Date().toISOString(), ...extra });
    if (prior) await db.artifact.update({ where: { id: prior.id }, data: { metadata } });
    else await db.artifact.create({ data: { ownerId: owner, type: 'text', sourceModule: PICK_LEDGER_MODULE, title: candidate.key, status: 'hidden', visibility: 'unlisted', metadata } });
  };
  const row = (candidate: Candidate, result: PickItem['result'], extra: Partial<PickItem> = {}) =>
    report.items.push({ repo: candidate.info?.fullName ?? candidate.repo, channels: [...candidate.channels], stars: candidate.info?.stars, result, ...extra });

  // 4) repo facts (cheap, no AI) + quality gate
  const now = Date.now();
  const ranked: Candidate[] = [];
  for (const candidate of fresh.slice(0, 40)) {
    try {
      const info = await repoInfo(candidate.repo);
      if (!info) { await remember(candidate, 'rejected', { detail: 'not found' }); row(candidate, 'rejected', { detail: '저장소 없음' }); continue; }
      candidate.info = info;
      const stale = now - Date.parse(info.pushedAt) > 180 * DAY;
      const tooSmall = info.stars < 100 && candidate.channels.size < 2;
      if (info.archived || info.fork || stale || tooSmall) {
        const detail = info.archived ? '보관된 저장소' : info.fork ? '포크 저장소' : stale ? '6개월 넘게 업데이트 없음' : '별 100개 미만';
        await remember(candidate, 'rejected', { detail }); row(candidate, 'rejected', { detail }); continue;
      }
      // The same repo can arrive under a renamed owner/name: settle it under its canonical name too.
      if (info.fullName.toLowerCase() !== candidate.key && (known.has(info.fullName.toLowerCase()) || ranked.some((other) => other.info!.fullName === info.fullName))) {
        row(candidate, 'skipped', { detail: '이미 다룬 저장소' }); continue;
      }
      candidate.score = score(candidate, now);
      ranked.push(candidate);
    } catch (error) { row(candidate, 'error', { detail: (error as Error).message.slice(0, 120) }); }
  }
  ranked.sort((a, b) => b.score! - a.score!);

  // 5) write and publish the best few
  let published = 0;
  for (const candidate of ranked) {
    if (published >= perDay) { row(candidate, 'skipped', { detail: '오늘 게시 수 도달 (다음 실행에서 다시 후보)' }); continue; }
    if (report.aiCalls >= maxAi) { row(candidate, 'blocked', { detail: 'AI 호출 상한' }); continue; }
    const info = candidate.info!;
    try {
      const readme = await repoReadme(info.fullName);
      // One transcript per repo (the newest video). A failed transcript never blocks the card: README is the main source.
      const lead = [...candidate.videos].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0];
      const transcript = await fetchSocialKitTranscript(lead.videoId).then((result) => result.text).catch(() => '');
      report.aiCalls++;
      const written = await writeCard({
        repo: info, readme, channels: [...candidate.channels], transcript,
        videos: candidate.videos.map((video) => ({ title: video.title, channel: video.channel, description: video.description })),
      });
      if (!written.ok) { await remember(candidate, 'rejected', { detail: written.reason }); row(candidate, 'rejected', { detail: written.reason }); continue; }

      const content: PickContent = {
        repo: info.fullName, repoUrl: info.url, ...written.card, stars: info.stars, language: info.language, license: info.license, pushedAt: info.pushedAt, topics: info.topics,
        videos: candidate.videos.map(({ videoId, title, channel, url, publishedAt }) => ({ videoId, title, channel, url, publishedAt })),
      };
      if (dryRun) { row(candidate, 'preview', { preview: content }); published++; continue; }

      await db.artifact.create({
        data: {
          ownerId: owner, type: 'text', sourceModule: PICK_MODULE, title: content.title, description: content.oneLine,
          fileUrl: `https://opengraph.githubassets.com/coai/${info.fullName}`, status: 'published', visibility: 'public',
          metadata: JSON.stringify({ pick: content, ingest: { score: candidate.score, at: new Date().toISOString() } }),
        },
      });
      await remember(candidate, 'published');
      published++; report.published++;
      row(candidate, 'published');
    } catch (error) {
      if (error instanceof AiUnavailableError) { report.aborted = error.message; row(candidate, 'blocked', { detail: error.message }); break; }
      const detail = (error as Error).message.slice(0, 160);
      await remember(candidate, 'error', { detail }).catch(() => undefined);
      row(candidate, 'error', { detail });
    }
  }
  return report;
}
