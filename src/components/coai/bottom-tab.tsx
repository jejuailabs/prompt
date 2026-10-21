'use client';

import { useTranslations } from 'next-intl';
import { BookOpen, Compass, Home, Newspaper, PlaySquare, Sparkles, Users, Wrench } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { COAI_BOTTOM_TABS, COAI_MENUS, activeCoaiMenu, coaiMenuHref, type CoaiMenu } from '@/lib/coai-navigation';
import { useMenuNavigate } from './header';

const ICONS: Record<CoaiMenu['icon'], typeof Home> = { home: Home, newspaper: Newspaper, sparkles: Sparkles, 'play-square': PlaySquare, wrench: Wrench, compass: Compass, 'book-open': BookOpen, users: Users };

/** Mobile bottom tab bar, five fixed slots (docs/coai/02 §2, 03 §2.6). */
export default function CoaiBottomTab() {
  const t = useTranslations('coai');
  const view = useAppStore((s) => s.view);
  const go = useMenuNavigate();
  const active = activeCoaiMenu(view);
  const tabs = COAI_BOTTOM_TABS.map((id) => COAI_MENUS.find((menu) => menu.id === id)!);
  return (
    <nav className="coai-bottom-tab" aria-label={t('navAria')}>
      {tabs.map((menu) => {
        const Icon = ICONS[menu.icon];
        const current = active === menu.id;
        return (
          <a key={menu.id} href={coaiMenuHref(menu)} aria-current={current ? 'page' : undefined} onClick={(event) => go(event, menu)}>
            <Icon size={24} strokeWidth={current ? 2.2 : 1.75} fill={current && menu.icon === 'home' ? 'currentColor' : 'none'} fillOpacity={current ? 0.15 : 0} />
            {t(menu.labelKey)}
          </a>
        );
      })}
    </nav>
  );
}
