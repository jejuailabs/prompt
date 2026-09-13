// i18n aggregator — merges per-namespace message packs and serves the active locale.
// Each view owns its own messages.ts file (no cross-agent file conflicts).
import type { Locale } from '@/lib/types';
import core from '@/lib/i18n/messages/core';
import home from '@/components/views/home/messages';
import gallery from '@/components/views/gallery/messages';
import prompt from '@/components/views/prompt/messages';
import myProjects from '@/components/views/my-projects/messages';
import community from '@/components/views/community/messages';
import academy from '@/components/views/academy/messages';
import project from '@/components/views/project/messages';
import lab from '@/components/views/lab/messages';
import pipelines from '@/components/views/pipelines/messages';
import smoke from '@/components/views/smoke/messages';
import revenue from '@/components/views/revenue/messages';
import market from '@/components/views/market/messages';
import admin from '@/components/views/admin/messages';
import videoStudio from '@/components/views/video-studio/messages';
import studio3d from '@/components/views/3d-studio/messages';

type Pack = { ko: Record<string, string>; en: Record<string, string> };

const registry: Record<string, Pack> = {
  core: core as unknown as Pack,
  home: home as unknown as Pack,
  gallery: gallery as unknown as Pack,
  prompt: prompt as unknown as Pack,
  myProjects: myProjects as unknown as Pack,
  community: community as unknown as Pack,
  academy: academy as unknown as Pack,
  project: project as unknown as Pack,
  lab: lab as unknown as Pack,
  pipelines: pipelines as unknown as Pack,
  smoke: smoke as unknown as Pack,
  revenue: revenue as unknown as Pack,
  market: market as unknown as Pack,
  admin: admin as unknown as Pack,
  videoStudio: videoStudio as unknown as Pack,
  studio3d: studio3d as unknown as Pack,
};

export function getMessages(locale: Locale): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [ns, pack] of Object.entries(registry)) {
    out[ns] = { ...(pack.ko ?? {}), ...(pack[locale] ?? {}) };
  }
  return out;
}
