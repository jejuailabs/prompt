'use client';

import { useTranslations } from 'next-intl';
import { useSession } from '@/hooks/use-session';
import ViewRouter from '@/components/views/view-router';
import Sidebar from './sidebar';
import Header from './header';
import MobileTabbar from './mobile-tabbar';

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

  return (
    <div className="flex flex-1">
      <Sidebar />

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        <Header />
        <main className="w-full min-w-0 flex-1 px-4 py-4 pb-20 md:px-6 md:py-6 md:pb-6 lg:px-8">
          <ViewRouter />
        </main>
        <footer className="mt-auto border-t py-4 text-center text-xs text-muted-foreground">
          © 2026 PLAYLAB · {t('footerNote')}
        </footer>
      </div>

      <MobileTabbar />
    </div>
  );
}
