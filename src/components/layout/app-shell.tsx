'use client';

import { useTranslations } from 'next-intl';
import { useSession } from '@/hooks/use-session';
import ViewRouter from '@/components/views/view-router';
import Header from './header';
import MobileTabbar from './mobile-tabbar';
import { StudioSwitcher } from '@/components/experience/studio-switcher';
import { useAppStore } from '@/lib/store';
import './poster-shell.css';

/**
 * App shell: desktop sidebar (md+, sticky) + right column (header / main / sticky footer)
 * + mobile bottom tab bar (fixed).
 *
 * Layout contract (docs/09): root wrapper in playlab-app is `min-h-screen flex flex-col`;
 * the right column is `flex flex-col min-h-screen flex-1` and the footer uses `mt-auto`
 * so it sticks to the bottom on short pages and is pushed naturally on long ones.
 */
export default function AppShell() {
  useSession(); // boot: fetch session cookie → store (also used by sidebar/header)
  const t = useTranslations('core');
  const view = useAppStore(s => s.view);
  const poster = ['academy', 'ai-tools', 'tool', 'my-projects', 'project', 'prompt'].includes(view);

  return (
    <div className={`ribbon-app flex flex-1 ${poster ? 'poster-app dark' : ''}`}>

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        <Header poster={poster} />
        <main id="main-content" className="w-full min-w-0 flex-1 pb-20 md:pb-0">
          <StudioSwitcher />
          <ViewRouter />
        </main>
        <footer className="ribbon-footer mt-auto border-t text-xs text-muted-foreground">
          <span className="brand-wordmark">PLAYLAB<span>®</span></span>
          <span>작은 실험이 이어지는 곳.</span>
          <span>© 2026 PLAYLAB · {t('footerNote')}</span>
        </footer>
      </div>

      <MobileTabbar />
    </div>
  );
}
