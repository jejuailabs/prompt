import type { ArtifactDTO } from './types';

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}
function webUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^(https?:\/\/|\/[^/])/.test(value) ? value : null;
}
export function modelSource(artifact: Pick<ArtifactDTO, 'metadata' | 'fileUrl'>): string | null {
  const meta = object(artifact.metadata);
  const outputs = Array.isArray(meta.outputs) ? meta.outputs : [];
  const output = object(outputs[outputs.length - 1]);
  for (const candidate of [output.riggedGlbUrl, output.glbUrl, meta.glbUrl, artifact.fileUrl]) {
    const url = webUrl(candidate);
    if (url && /\.(glb|gltf)(?:[?#]|$)/i.test(url)) return url;
  }
  return null;
}
export function videoSource(artifact: Pick<ArtifactDTO, 'metadata' | 'fileUrl'>): string | null {
  const meta = object(artifact.metadata);
  const render = object(meta.render);
  return webUrl(render.videoUrl) || webUrl(meta.videoUrl) || (artifact.fileUrl && /\.(mp4|webm|mov)(?:[?#]|$)/i.test(artifact.fileUrl) ? webUrl(artifact.fileUrl) : null);
}

export function artifactThumbnail(artifact: Pick<ArtifactDTO, 'type' | 'metadata' | 'fileUrl' | 'contentUrl'>): string | null {
  const preview = webUrl(artifact.metadata?.previewUrl);
  if (preview) return preview;
  // Editorial covers for bundled PLAYLAB demos, after any user-supplied preview.
  if (artifact.type === 'game' && artifact.fileUrl === '/uploads/seed/thumb-space-shooter.png') return '/uploads/seed/space-cover-v3.png';
  if (artifact.type === 'game' && !artifact.fileUrl && artifact.contentUrl === '/games/flappy.html') return '/uploads/seed/flappy-cover-v4.png';
  if (artifact.type === 'image' || artifact.type === 'game' || artifact.type === 'app') {
    const file = webUrl(artifact.fileUrl);
    if (file) return file;
  }
  const bundledGame = artifact.contentUrl?.match(/^\/games\/(flappy|brick-breaker|helicopter|snake|tetris|pong|archery|match3|minesweeper|puzzle2048|space-shooter)\.html$/)?.[1];
  if (artifact.type === 'game' && bundledGame) return `/games/thumbs/${bundledGame}.png`;
  return webUrl(artifact.metadata?.frames?.[0]);
}
