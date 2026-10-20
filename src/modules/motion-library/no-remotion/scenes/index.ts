// No Remotion scenes: the original example code running on the Motion Lite runtime.
// Add an example here once its imports are switched to '../runtime' and it plays and records correctly.
import type { ComponentType } from 'react';
import type { VideoConfig } from '../runtime';

export interface WebScene { id: string; config: VideoConfig; load: () => Promise<{ Scene: ComponentType }> }

const scene = (id: string, durationInFrames: number, load: WebScene['load']): WebScene => ({
  id, load, config: { id: 'Scene', width: 1280, height: 720, fps: 30, durationInFrames },
});

export const WEB_SCENES: WebScene[] = [
  scene('51', 180, () => import('./51')),
  scene('52', 240, () => import('./52')),
  scene('56', 210, () => import('./56')),
  scene('57', 180, () => import('./57')),
  scene('41', 180, () => import('./41')),
  scene('44', 180, () => import('./44')),
  scene('45', 180, () => import('./45')),
  scene('01a', 150, () => import('./01a')),
  scene('01b', 180, () => import('./01b')),
  scene('16', 150, () => import('./16')),
];

export const webSceneById = (id?: string) => WEB_SCENES.find(item => item.id === id);
