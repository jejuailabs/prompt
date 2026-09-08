'use client';

import { useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ko as koLocale } from 'date-fns/locale';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { QUICK_ACTIONS } from '@/lib/quick-actions';
import { useRefreshSession } from '@/hooks/use-session';
import { Icon } from '@/components/layout/icon';
import { Logo } from '@/components/layout/logo';
import { CreatePromptDialog } from '@/components/shared/create-prompt-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { EventDTO, ViewKey } from '@/lib/types';
import { cn } from '@/lib/utils';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

// ─── theme toggle (hydration-safe "mounted" via useSyncExternalStore) ──────

const emptySubscribe = () => () => {};

function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client snapshot: hydrated
    () => false, // server snapshot
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <Icon name="sun" className="size-4" /> : <Icon name="moon" className="size-4" />}
    </Button>
  );
}

// ─── notification bell ──────────────────────────────────────────────────────

function eventVisual(type: string): { icon: string; className: string } {
  if (type.startsWith('artifact')) return { icon: 'file-text', className: 'bg-primary/10 text-primary' };
  if (type.startsWith('prompt')) return { icon: 'pen-line', className: 'bg-primary/10 text-primary' };
  if (type.startsWith('pipeline')) return { icon: 'workflow', className: 'bg-sky-500/10 text-sky-600' };
  if (type.startsWith('smoke')) return { icon: 'radar', className: 'bg-amber-500/10 text-amber-600' };
  if (type.startsWith('revenue') || type.startsWith('credit')) return { icon: 'credit-card', className: 'bg-emerald-500/10 text-emerald-600' };
  if (type.startsWith('vote') || type.startsWith('like')) return { icon: 'heart', className: 'bg-red-500/10 text-red-500' };
  if (type.startsWith('comment')) return { icon: 'message-circle', className: 'bg-violet-500/10 text-violet-500' };
  if (type.startsWith('brief') || type.startsWith('match') || type.startsWith('contract')) return { icon: 'target', className: 'bg-primary/10 text-primary' };
  return { icon: 'sparkles', className: 'bg-muted text-muted-foreground' };
}

function eventTitle(e: EventDTO): string {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  for (const key of ['title', 'artifactTitle', 'promptTitle', 'briefTitle', 'username']) {
    const v = p[key];
    if (typeof v === 'string' && v) return v;
  }
  return e.type;
}

function NotificationBell() {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const [open, setOpen] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get<EventDTO[]>('/api/events?limit=8'),
    enabled: open,
    staleTime: 10_000,
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('notifications')}>
          <Icon name="bell" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2 text-sm font-medium">{t('notifications')}</div>
        <div className="scrollbar-thin max-h-80 overflow-y-auto p-1">
          {isLoading && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t('loading')}</p>}
          {!isLoading && events.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t('noNotifications')}</p>
          )}
          {events.map((e) => {
            const vis = eventVisual(e.type);
            return (
              <div key={e.id} className="flex items-start gap-2.5 rounded-md px-2.5 py-2">
                <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full', vis.className)}>
                  <Icon name={vis.icon} className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{eventTitle(e)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.createdAt), {
                      addSuffix: true,
                      locale: locale === 'en' ? enUS : koLocale,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── account dropdown (desktop) ─────────────────────────────────────────────

function AccountMenu() {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const navigate = useAppStore((s) => s.navigate);
  const setLoginOpen = useAppStore((s) => s.setLoginOpen);
  const refreshSession = useRefreshSession();

  if (!session) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setLoginOpen(true)}>
        {t('login')}
      </Button>
    );
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* ignore — clear local session regardless */
    }
    setSession(null);
    refreshSession();
    navigate('home');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={session.username}
        >
          <Avatar className="size-8 border">
            {session.avatarUrl && <AvatarImage src={session.avatarUrl} alt={session.username} />}
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
              {session.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{session.username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('my-projects')}>
          <Icon name="folder-kanban" className="size-4" />
          {locale === 'en' ? 'My Projects' : '내 프로젝트'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
          <Icon name="log-out" className="size-4" />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── create / quick actions ─────────────────────────────────────────────────

function CreateMenu() {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const [createOpen, setCreateOpen] = useState(false);

  const runAction = (key: string) => {
    const action = QUICK_ACTIONS.find((a) => a.key === key);
    if (!action) return;
    if (action.kind === 'dialog') {
      setCreateOpen(true);
      return;
    }
    if (action.view) navigate(action.view as ViewKey, action.params);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1 px-2.5">
            <Icon name="plus" className="size-4" />
            <span className="hidden sm:inline">{t('create')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t('quickActionsTitle')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {QUICK_ACTIONS.map((a) => (
            <DropdownMenuItem key={a.key} onClick={() => runAction(a.key)}>
              <Icon name={a.icon} className="size-4 text-primary" />
              {locale === 'en' ? a.en : a.ko}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreatePromptDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

// ─── header ─────────────────────────────────────────────────────────────────

/** Sticky top header. Desktop: search + bell + theme + account + create. Mobile: compact. */
export default function Header() {
  const t = useTranslations('core');
  const navigate = useAppStore((s) => s.navigate);

  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const search = (value: string) => {
    const v = value.trim();
    if (!v) return;
    navigate('gallery', { q: v });
    setQ('');
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 md:px-6">
        {/* mobile logo */}
        <button type="button" className="md:hidden" onClick={() => navigate('home')}>
          <Logo compact />
        </button>

        {/* desktop search */}
        <div className="relative hidden w-full max-w-md md:block">
          <Icon name="search" className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search(q);
            }}
            placeholder={t('searchPlaceholder')}
            className="pl-8"
            aria-label={t('searchPlaceholder')}
          />
        </div>

        <div className="ml-auto flex items-center gap-1 md:gap-1.5">
          {/* mobile search trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t('searchPlaceholder')}
            onClick={() => setSearchOpen(true)}
          >
            <Icon name="search" className="size-4" />
          </Button>

          <ThemeToggle />

          <div className="hidden md:block">
            <NotificationBell />
          </div>
          <div className="hidden md:block">
            <AccountMenu />
          </div>

          <CreateMenu />
        </div>
      </div>

      {/* mobile full-screen search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative flex items-center gap-2 border-b bg-background p-3">
            <Icon name="search" className="size-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') search(q);
                if (e.key === 'Escape') setSearchOpen(false);
              }}
              placeholder={t('searchPlaceholder')}
              className="border-0 shadow-none focus-visible:ring-0"
              aria-label={t('searchPlaceholder')}
            />
            <Button variant="ghost" size="icon" aria-label={t('close')} onClick={() => setSearchOpen(false)}>
              <Icon name="x" className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
