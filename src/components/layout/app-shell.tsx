'use client';

import { useTranslations } from 'next-intl';
import { useSession } from '@/hooks/use-session';
import ViewRouter from '@/components/views/view-router';
import CoaiHeader from '@/components/coai/header';
import CoaiBottomTab from '@/components/coai/bottom-tab';
import { CoaiLogo } from '@/components/coai/logo';
import '@/components/coai/coai.css';
import { StudioSwitcher } from '@/components/experience/studio-switcher';
import { useAppStore } from '@/lib/store';
import './poster-shell.css';
import './poster-pages.css';

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
  const tc = useTranslations('coai');
  const view = useAppStore(s => s.view);

  return (
    <div className="coai-shell ribbon-app poster-app flex flex-1" data-view={view}>

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        <CoaiHeader />
        <main id="main-content" className="coai-main w-full min-w-0 flex-1">
          {view !== 'home' && <StudioSwitcher />}
          <ViewRouter />
        </main>
        <footer className="coai-footer">
          <div className="coai-container">
            <CoaiLogo height={24} />
            <span>{tc('footerNote')}</span>
            <small>© 2026 COAI</small>
          </div>
        </footer>
      </div>

      <CoaiBottomTab />
    </div>
  );
}
