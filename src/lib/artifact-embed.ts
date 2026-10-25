import { getLocalLittleWorld, LITTLE_WORLDS } from '@/lib/little-worlds';
import { getLocalArcadeGame, LOCAL_ARCADE_GAMES } from '@/lib/bundled-arcade-games';
import type { ArtifactDTO } from '@/lib/types';

export function canEmbedArtifact(artifact: { status: string; visibility: string; sourceModule?: string | null }) {
  return artifact.status === 'published' && artifact.visibility === 'public' && artifact.sourceModule !== 'landing-pages';
}

export function builtinEmbedArtifact(id: string): ArtifactDTO | undefined {
  const game = getLocalLittleWorld(id) ?? getLocalArcadeGame(id);
  if (!game) return;
  return {
    ...game, type: 'game', owner: { id: '', username: 'COAI', avatarUrl: null, role: 'admin' },
    status: 'published', visibility: 'public', version: '1', views: 0, commentCount: 0,
    metadata: { tags: [] },
  };
}

/** Only repository-shipped games may run with the site's origin privileges. */
export function bundledGameForUrl(value: string, origin: string) {
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return;
    return [...LITTLE_WORLDS, ...LOCAL_ARCADE_GAMES].find(game => game.contentUrl === url.pathname);
  } catch { return; }
}

export function gameFrameUrl(value: string, origin: string, preview = false) {
  if (!bundledGameForUrl(value, origin)) return value;
  const url = new URL(value, origin);
  url.searchParams.set('embed', '1');
  url.searchParams.set('parentOrigin', origin);
  if (preview) url.searchParams.set('preview', '1');
  return url.href;
}

export function artifactShareUrl(origin: string, id: string, game = false) {
  return `${origin ? new URL('/app', origin).href : '/app'}#${game ? 'game-play' : 'project'}?id=${encodeURIComponent(id)}`;
}

function escapeAttribute(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function artifactEmbedCode(origin: string, id: string, title: string) {
  const url = new URL(`/embed/${encodeURIComponent(id)}`, origin).href;
  return `<iframe src="${escapeAttribute(url)}" title="${escapeAttribute(title)}" width="960" height="640" style="width:100%;max-width:960px;border:0;border-radius:12px" allow="autoplay; fullscreen; gamepad" allowfullscreen loading="lazy"></iframe>`;
}
