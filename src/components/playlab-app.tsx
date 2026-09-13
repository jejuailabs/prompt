'use client';

// PLAYLAB app host — boot sequence + shell composition.
// Single visible route (SPA view-switching via zustand store, see worklog).
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import AppShell from '@/components/layout/app-shell';
import LoginDialog from '@/components/shared/login-dialog';

export default function PlaylabApp() {
  const hydrateFromHash = useAppStore((s) => s.hydrateFromHash);
  const setLocale = useAppStore((s) => s.setLocale);
  const locale = useAppStore((s) => s.locale);

  useEffect(() => {
    const saved = localStorage.getItem('pl_locale');
    if (saved === 'en' || saved === 'ko') setLocale(saved);
    hydrateFromHash();
    const onLocationChange = () => hydrateFromHash();
    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);
    return () => {
      window.removeEventListener('hashchange', onLocationChange);
      window.removeEventListener('popstate', onLocationChange);
    };
  }, [hydrateFromHash, setLocale]);

  return (
    <div lang={locale} className="min-h-screen flex flex-col bg-background text-foreground">
      <AppShell />
      <LoginDialog />
    </div>
  );
}
