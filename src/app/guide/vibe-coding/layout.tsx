import Link from 'next/link';
import type { ReactNode } from 'react';
import { MANUAL_PATH, MANUAL_TITLE } from '@/components/views/vibe-setup/manual';

// Crawlable manual pages: plain server-rendered HTML, outside the SPA shell.
export default function ManualLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <img src="/logo.svg" alt="" className="size-6" />PLAYLAB
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href={MANUAL_PATH} className="text-muted-foreground hover:text-foreground">{MANUAL_TITLE}</Link>
            <a href="/#vibe-setup" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">따라 하기 시작</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">© PLAYLAB · 바이브코딩 올인원 플랫폼</footer>
    </div>
  );
}
