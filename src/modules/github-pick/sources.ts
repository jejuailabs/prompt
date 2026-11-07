// Inputs for 깃허브 픽: YouTube channel RSS (free, includes Shorts) and the GitHub REST API.
// SocialKit stays the only transcript source (CLAUDE.md); its channel list API skips Shorts, so RSS is used for discovery.
import type { PickChannel } from './channels';
import type { PickVideo } from './pick';

export type FeedVideo = PickVideo & { description: string; channelId: string };

const decode = (text: string) => text
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

function tag(xml: string, name: string) {
  const start = xml.indexOf(`<${name}`);
  if (start < 0) return '';
  const open = xml.indexOf('>', start) + 1;
  const end = xml.indexOf(`</${name}>`, open);
  return end < 0 ? '' : decode(xml.slice(open, end).trim());
}

export async function channelFeed(channel: PickChannel): Promise<FeedVideo[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; COAI-github-pick)' }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();
  return xml.split('<entry>').slice(1).map((entry) => {
    const videoId = tag(entry, 'yt:videoId');
    return {
      videoId, title: tag(entry, 'title'), channel: channel.name, channelId: channel.id,
      url: `https://www.youtube.com/watch?v=${videoId}`, publishedAt: tag(entry, 'published'), description: tag(entry, 'media:description'),
    };
  }).filter((video) => video.videoId);
}

// github.com/<owner>/<repo> links only — not profiles, sponsors, gists, topics or GitHub's own pages.
const RESERVED_OWNERS = new Set(['sponsors', 'orgs', 'topics', 'settings', 'features', 'marketplace', 'apps', 'about', 'pricing', 'login', 'join', 'explore', 'collections', 'trending', 'search', 'site', 'enterprise', 'readme', 'events', 'github']);

export function repoLinks(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})/g)) {
    const owner = match[1], name = match[2].replace(/\.git$/, '').replace(/[.]+$/, '');
    if (!name || RESERVED_OWNERS.has(owner.toLowerCase())) continue;
    found.add(`${owner}/${name}`);
  }
  return [...found];
}

export type RepoInfo = {
  fullName: string; url: string; description: string; stars: number; language: string; license: string;
  pushedAt: string; createdAt: string; topics: string[]; archived: boolean; fork: boolean; homepage: string;
};

function githubHeaders(accept = 'application/vnd.github+json') {
  const token = process.env.GITHUB_TOKEN?.trim();
  return { accept, 'user-agent': 'COAI-github-pick', 'x-github-api-version': '2022-11-28', ...(token ? { authorization: `Bearer ${token}` } : {}) };
}

/** Returns null for a repo that no longer exists (404) — that link is simply skipped. */
export async function repoInfo(fullName: string): Promise<RepoInfo | null> {
  const res = await fetch(`https://api.github.com/repos/${fullName}`, { headers: githubHeaders(), cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (res.status === 404 || res.status === 451) return null;
  if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
  const repo = await res.json() as {
    full_name: string; html_url: string; description: string | null; stargazers_count: number; language: string | null; license: { spdx_id?: string; name?: string } | null;
    pushed_at: string; created_at: string; topics?: string[]; archived: boolean; fork: boolean; homepage: string | null;
  };
  return {
    fullName: repo.full_name, url: repo.html_url, description: repo.description ?? '', stars: repo.stargazers_count, language: repo.language ?? '',
    license: repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : (repo.license?.name ?? ''),
    pushedAt: repo.pushed_at, createdAt: repo.created_at, topics: (repo.topics ?? []).slice(0, 8), archived: repo.archived, fork: repo.fork, homepage: repo.homepage ?? '',
  };
}

/** README as plain markdown, cut to keep the AI call small. '' when the repo has none. */
export async function repoReadme(fullName: string, max = 9000): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${fullName}/readme`, { headers: githubHeaders('application/vnd.github.raw'), cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return '';
  const text = await res.text();
  return text.replace(/<!--[\s\S]*?-->/g, '').replace(/<img[^>]*>/gi, '').replace(/\n{3,}/g, '\n\n').slice(0, max);
}
