'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { COAI_MENUS, activeCoaiMenu, coaiMenuHref, type CoaiMenu } from '@/lib/coai-navigation';
import { AccountMenu, NotificationBell } from '@/components/layout/header';
import { CreditsWidget } from '@/components/layout/sidebar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CoaiLogo } from './logo';

/** Client-side menu navigation that keeps normal links (open in new tab, copy link). */
export function useMenuNavigate() {
  const navigate = useAppStore((s) => s.navigate);
  return (event: MouseEvent, menu: CoaiMenu) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(menu.target.view, menu.target.params);
  };
}

function ThemeSwitch() {
  const t = useTranslations('coai');
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const dark = mounted && resolvedTheme === 'dark';
  return (
    <button type="button" className="coai-icon-btn coai-icon-btn-outline" aria-label={`${t('theme')}: ${dark ? t('themeDark') : t('themeLight')}`} onClick={() => setTheme(dark ? 'light' : 'dark')}>
      {dark ? <Moon size={18} strokeWidth={1.75} /> : <Sun size={18} strokeWidth={1.75} />}
    </button>
  );
}

function LocaleSwitch() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const t = useTranslations('coai');
  return (
    <button type="button" className="coai-btn coai-btn-outline" style={{ height: 36, padding: '0 10px', fontSize: 14 }} aria-label={t('language')} onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}>
      {locale === 'ko' ? 'KO' : 'EN'}
    </button>
  );
}

function SearchBox({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const t = useTranslations('coai');
  const navigate = useAppStore((s) => s.navigate);
  const [q, setQ] = useState('');
  return (
    <form className="coai-search" role="search" onSubmit={(event) => { event.preventDefault(); const value = q.trim(); if (!value) return; navigate('gallery', { q: value }); setQ(''); onDone?.(); }}>
      <Search size={18} strokeWidth={1.75} />
      <input value={q} onChange={(event) => setQ(event.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('search')} autoFocus={autoFocus} onKeyDown={(event) => { if (event.key === 'Escape') onDone?.(); }} />
    </form>
  );
}

function AuthArea({ onCredits }: { onCredits: () => void }) {
  const t = useTranslations('coai');
  const session = useAppStore((s) => s.session);
  const setLoginOpen = useAppStore((s) => s.setLoginOpen);
  if (session) return <><NotificationBell /><AccountMenu onCredits={onCredits} /></>;
  return <>
    <button type="button" className="coai-btn coai-btn-outline" onClick={() => setLoginOpen(true)}>{t('login')}</button>
    <button type="button" className="coai-btn coai-btn-primary" onClick={() => setLoginOpen(true, 'signup')}>{t('signup')}</button>
  </>;
}

/** COAI header (docs/coai/03 §2.1, §2.6): PC 72px GNB, mobile 56px + scroll tabs + drawer. */
export default function CoaiHeader() {
  const t = useTranslations('coai');
  const view = useAppStore((s) => s.view);
  const session = useAppStore((s) => s.session);
  const setLoginOpen = useAppStore((s) => s.setLoginOpen);
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const { resolvedTheme, setTheme } = useTheme();
  const go = useMenuNavigate();
  const active = activeCoaiMenu(view);
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const links = (className?: string) => COAI_MENUS.map((menu) => (
    <a key={menu.id} href={coaiMenuHref(menu)} className={className} aria-current={active === menu.id ? 'page' : undefined} onClick={(event) => { setDrawer(false); go(event, menu); }}>{t(menu.labelKey)}</a>
  ));

  return (
    <header className="coai-header" data-scrolled={scrolled || undefined}>
      <div className="coai-container">
        <div className="coai-header-row">
          <div className="coai-header-brand">
            <a href="/" aria-label={t('homeAria')} onClick={(event) => go(event, COAI_MENUS[0])}><CoaiLogo height={30} /></a>
            <span className="coai-tagline coai-desktop-only">{t('brandTagline')}</span>
          </div>
          <nav className="coai-gnb coai-desktop-only" aria-label={t('navAria')}>{links()}</nav>
          <div className="coai-header-actions">
            <div className="coai-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SearchBox />
              <AuthArea onCredits={() => setCreditsOpen(true)} />
              <ThemeSwitch />
              <LocaleSwitch />
            </div>
            <button type="button" className="coai-icon-btn coai-mobile-only" aria-label={t('search')} onClick={() => setSearchOpen(true)}><Search size={22} strokeWidth={1.75} /></button>
            <button type="button" className="coai-icon-btn coai-mobile-only" aria-label={t('menu')} aria-expanded={drawer} onClick={() => setDrawer(true)}><Menu size={24} strokeWidth={1.75} /></button>
          </div>
        </div>
      </div>
      <nav className="coai-scroll-tabs coai-mobile-only coai-container" aria-label={t('navAria')}>{links()}</nav>

      {searchOpen && <div className="coai-search-overlay"><SearchBox autoFocus onDone={() => setSearchOpen(false)} /><button type="button" className="coai-icon-btn" aria-label={t('close')} onClick={() => setSearchOpen(false)}><X size={22} /></button></div>}

      {drawer && <>
        <div className="coai-drawer-backdrop" onClick={() => setDrawer(false)} />
        <aside className="coai-drawer" role="dialog" aria-modal="true" aria-label={t('menu')}>
          <div className="coai-drawer-head"><CoaiLogo height={26} /><button type="button" className="coai-icon-btn" aria-label={t('close')} onClick={() => setDrawer(false)}><X size={22} /></button></div>
          {links()}
          <div className="coai-drawer-section">
            {session
              ? <button type="button" className="coai-btn coai-btn-outline" onClick={() => { setDrawer(false); setCreditsOpen(true); }}>◉ {session.credits.toLocaleString()}</button>
              : <div className="coai-segment"><button type="button" onClick={() => { setDrawer(false); setLoginOpen(true); }}>{t('login')}</button><button type="button" aria-pressed="true" onClick={() => { setDrawer(false); setLoginOpen(true, 'signup'); }}>{t('signup')}</button></div>}
            <span className="coai-drawer-label">{t('theme')}</span>
            <div className="coai-segment"><button type="button" aria-pressed={resolvedTheme !== 'dark'} onClick={() => setTheme('light')}>{t('themeLight')}</button><button type="button" aria-pressed={resolvedTheme === 'dark'} onClick={() => setTheme('dark')}>{t('themeDark')}</button></div>
            <span className="coai-drawer-label">{t('language')}</span>
            <div className="coai-segment"><button type="button" aria-pressed={locale === 'ko'} onClick={() => setLocale('ko')}>한국어</button><button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button></div>
          </div>
        </aside>
      </>}

      <Dialog open={creditsOpen} onOpenChange={setCreditsOpen}><DialogContent><DialogHeader><DialogTitle>{locale === 'en' ? 'Your credits' : '내 크레딧'}</DialogTitle><DialogDescription>{locale === 'en' ? 'Check your balance and request a top-up.' : '잔액을 확인하고 충전을 요청하세요.'}</DialogDescription></DialogHeader><CreditsWidget /></DialogContent></Dialog>
    </header>
  );
}
