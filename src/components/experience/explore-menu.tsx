'use client';
import { Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/lib/store';
import { useModules } from '@/hooks/use-session';
import { moduleTitle } from '@/lib/registry/module-configs';
import { moduleDestination } from '@/lib/module-navigation';
import { Icon } from '@/components/layout/icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function ExploreMenu() {
  const { data: modules = [] } = useModules();
  const navigate = useAppStore(s => s.navigate);
  const locale = useAppStore(s => s.locale);
  const session = useAppStore(s => s.session);
  const setLocale = useAppStore(s => s.setLocale);
  const { resolvedTheme, setTheme } = useTheme();
  const menuModules = modules.filter(m => m.group !== 'tools' && (!m.adminOnly || session?.role === 'admin'));
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={locale === 'en' ? 'All spaces' : '전체 공간'}><Menu className="size-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-h-[70dvh] w-64 overflow-y-auto"><DropdownMenuLabel>EXPLORE PLAYLAB</DropdownMenuLabel><DropdownMenuSeparator />{menuModules.map(m => <DropdownMenuItem key={m.id} onClick={() => { const target = moduleDestination(m); navigate(target.view, target.params); }}><Icon name={m.icon} className="size-4" /><span className="flex-1">{moduleTitle(m, locale)}</span>{['preparing', 'coming-soon'].includes(m.status) && <span className="text-[10px] text-muted-foreground">SOON</span>}</DropdownMenuItem>)}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => setLocale(locale === 'en' ? 'ko' : 'en')}>한국어 / English</DropdownMenuItem><DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>{locale === 'en' ? 'Switch theme' : '밝은 / 어두운 화면'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
