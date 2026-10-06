'use client';
import { Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/lib/store';
import { useModules } from '@/hooks/use-session';
import { moduleTitle } from '@/lib/registry/module-configs';
import { SPACE_SECTIONS, spaceEntries } from '@/lib/site-navigation';
import { Icon } from '@/components/layout/icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function ExploreMenu() {
  const { data: modules = [] } = useModules();
  const locale = useAppStore(s => s.locale);
  const session = useAppStore(s => s.session);
  const setLocale = useAppStore(s => s.setLocale);
  const { resolvedTheme, setTheme } = useTheme();
  const menuModules = spaceEntries(modules, session?.role === 'admin');
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={locale === 'en' ? 'All spaces' : '전체 공간'}><Menu className="size-5" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="max-h-[75dvh] w-72 overflow-y-auto">
      {SPACE_SECTIONS.map(section => {
        const items = menuModules.filter(m => m.section === section.id);
        if (!items.length) return null;
        return <div key={section.id}><DropdownMenuLabel className="text-xs text-muted-foreground">{locale === 'en' ? section.en : section.ko}</DropdownMenuLabel>
          {items.map(m => <DropdownMenuItem key={m.id} asChild><a href={m.href}><Icon name={m.icon} className="size-4" /><span className="flex-1">{moduleTitle(m, locale)}</span>{section.id === 'upcoming' && <span className="text-[10px] text-muted-foreground">SOON</span>}</a></DropdownMenuItem>)}
          <DropdownMenuSeparator /></div>;
      })}
      <DropdownMenuItem onClick={() => setLocale(locale === 'en' ? 'ko' : 'en')}>한국어 / English</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>{locale === 'en' ? 'Switch theme' : '밝은 / 어두운 화면'}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
