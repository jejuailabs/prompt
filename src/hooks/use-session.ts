'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import type { SessionUser } from '@/lib/types';

export function useSession() {
  const session = useAppStore((s) => s.session);
  const refreshSession = useAppStore((s) => s.refreshSession);
  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);
  return session;
}

export function useRequireLogin() {
  const requireLogin = useAppStore((s) => s.requireLogin);
  return requireLogin;
}

export function useRefreshSession() {
  const refreshSession = useAppStore((s) => s.refreshSession);
  const qc = useQueryClient();
  return () => {
    void refreshSession();
    void qc.invalidateQueries();
  };
}

export function useSessionValue(): SessionUser | null {
  return useAppStore((s) => s.session);
}

/** Module registry hook — the ONLY way UI reads module state (docs/02) */
export function useModules(opts?: { enabledOnly?: boolean }) {
  const { enabledOnly = true } = opts ?? {};
  return useQuery({
    queryKey: ['modules', enabledOnly],
    queryFn: async () => {
      const all = await api.get<import('@/lib/types').ModuleDTO[]>('/api/modules');
      const list = enabledOnly ? all.filter((m) => m.enabled) : all;
      return list.sort((a, b) => a.navOrder - b.navOrder);
    },
    staleTime: 30_000,
  });
}
