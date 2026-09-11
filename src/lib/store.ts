'use client';

import { create } from 'zustand';
import type { Locale, SessionUser, ViewKey } from '@/lib/types';

const VIEW_KEYS: ViewKey[] = [
  'home', 'gallery', 'prompt', 'project', 'lab', 'pipelines', 'pipeline-run',
  'smoke', 'revenue', 'market', 'community', 'academy', 'ai-tools', 'my-projects',
  'game-room', 'game-play', 'admin',
];

export function encodeHash(view: ViewKey, params?: Record<string, string>): string {
  const p = params && Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : '';
  return `#${view}${p}`;
}

export function parseHash(): { view: ViewKey; params: Record<string, string> } {
  if (typeof window === 'undefined') return { view: 'home', params: {} };
  const h = window.location.hash.replace(/^#\/?/, '');
  const [v, q] = h.split('?');
  const view = (VIEW_KEYS as string[]).includes(v) ? (v as ViewKey) : 'home';
  const params = Object.fromEntries(new URLSearchParams(q || ''));
  return { view, params };
}

interface AppState {
  view: ViewKey;
  params: Record<string, string>;
  locale: Locale;
  session: SessionUser | null;
  loginOpen: boolean;
  booted: boolean;
  navigate: (view: ViewKey, params?: Record<string, string>) => void;
  hydrateFromHash: () => void;
  setLocale: (l: Locale) => void;
  setSession: (s: SessionUser | null) => void;
  setLoginOpen: (open: boolean) => void;
  setBooted: (b: boolean) => void;
  refreshSession: () => Promise<void>;
  requireLogin: () => boolean; // true if logged in; else opens login dialog
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'home',
  params: {},
  locale: 'ko',
  session: null,
  loginOpen: false,
  booted: false,

  navigate: (view, params) => {
    set({ view, params: params ?? {} });
    if (typeof window !== 'undefined') {
      history.replaceState(null, '', encodeHash(view, params));
    }
  },

  hydrateFromHash: () => {
    const { view, params } = parseHash();
    set({ view, params });
  },

  setLocale: (locale) => {
    set({ locale });
    if (typeof window !== 'undefined') localStorage.setItem('pl_locale', locale);
  },

  setSession: (session) => set({ session }),

  setLoginOpen: (loginOpen) => set({ loginOpen }),

  setBooted: (booted) => set({ booted }),

  refreshSession: async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const json = await res.json();
      set({ session: json.ok ? json.data : null });
    } catch {
      set({ session: null });
    }
  },

  requireLogin: () => {
    if (get().session) return true;
    set({ loginOpen: true });
    return false;
  },
}));
