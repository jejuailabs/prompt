'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { moduleTitle } from '@/lib/registry/module-configs';
import { useModules } from '@/hooks/use-session';
import { Icon } from '@/components/layout/icon';
import { ModuleStatusBadge } from '@/components/shared/module-badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ViewKey } from '@/lib/types';
import { cn } from '@/lib/utils';

const TABS = [
  { view: 'home', icon: 'home', ko: '홈', en: 'Home' },
  { view: 'gallery', icon: 'images', ko: '갤러리', en: 'Gallery' },
  { view: 'lab', icon: 'flask-conical', ko: '실험실', en: 'Lab' },
  { view: 'pipelines', icon: 'workflow', ko: '파이프라인', en: 'Pipelines' },
] as const;

const TAB_VIEWS: string[] = TABS.map((tb) => tb.view);

/** Mobile-only bottom tab bar (fixed, safe-area aware). "more" opens a Sheet with the remaining modules. */
export default function MobileTabbar() {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const session = useAppStore((s) => s.session);
  const setLoginOpen = useAppStore((s) => s.setLoginOpen);
  const { data: modules = [] } = useModules();

  const [moreOpen, setMoreOpen] = useState(false);

  const titleFor = (tab: (typeof TABS)[number]) => {
    const m = modules.find((mod) => mod.entryView === tab.view);
    return m ? moduleTitle(m, locale) : locale === 'en' ? tab.en : tab.ko;
  };

  const moreModules = modules.filter((m) => !m.adminOnly && !m.group && !['revenue-dashboard', 'marketplace'].includes(m.id) && !TAB_VIEWS.includes(m.entryView));
  const moreActive = moreModules.some((m) => m.entryView === view);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = view === tab.view;
          return (
            <button
              key={tab.view}
              type="button"
              onClick={() => navigate(tab.view as ViewKey)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon name={tab.icon} className="size-5" />
              <span className="truncate">{titleFor(tab)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={cn(
            'flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors',
            moreActive || moreOpen ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Icon name="ellipsis" className="size-5" />
          <span className="truncate">{t('more')}</span>
        </button>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('more')}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-1 pb-2">
            <button
              type="button"
              onClick={() => { navigate('ai-tools'); setMoreOpen(false); }}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon name="wrench" className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="text-sm font-medium">AI Tools</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">AI 도구 모음</span></span>
              <Icon name="chevron-right" className="size-4 shrink-0 text-muted-foreground" />
            </button>
            {moreModules.map((m) => {
              const active = m.entryView === view;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    navigate(m.entryView as ViewKey);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    active ? 'border-primary/40 bg-primary/5' : 'hover:bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-md',
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon name={m.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{moduleTitle(m, locale)}</span>
                      <ModuleStatusBadge status={m.status} newUntil={m.newUntil} />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {locale === 'en' ? m.descEn : m.descKo}
                    </span>
                  </span>
                  <Icon name="chevron-right" className="size-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
            {moreModules.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('empty')}</p>
            )}
          </div>
          {!session && (
            <Button
              className="mb-4 w-full"
              onClick={() => {
                setMoreOpen(false);
                setLoginOpen(true);
              }}
            >
              {t('login')}
            </Button>
          )}
        </SheetContent>
      </Sheet>
    </nav>
  );
}
