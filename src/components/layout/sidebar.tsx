'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { moduleTitle } from '@/lib/registry/module-configs';
import { useModules, useRefreshSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import { Icon } from '@/components/layout/icon';
import { Logo } from '@/components/layout/logo';
import { ModuleStatusBadge } from '@/components/shared/module-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ViewKey } from '@/lib/types';
import { cn } from '@/lib/utils';

const TOPUP_AMOUNTS = [1000, 5000, 10000] as const;

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

// ─── credits widget + top-up dialog ────────────────────────────────────────

function CreditsWidget() {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const session = useAppStore((s) => s.session);
  const refreshSession = useRefreshSession();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(5000);
  const [pending, setPending] = useState(false);

  const purchase = async () => {
    setPending(true);
    try {
      await api.post<{ balance: number }>('/api/credits/purchase', { amount });
      refreshSession();
      toast({
        title: locale === 'en' ? 'Credits topped up' : '크레딧이 충전되었습니다',
        description: `+${amount.toLocaleString()}`,
      });
      setOpen(false);
    } catch (e) {
      toast({ title: t('error'), description: errorMessage(e), variant: 'destructive' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="gap-2 rounded-lg p-3 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon name="credit-card" className="size-3.5" />
          {t('credits')}
        </span>
        <span className="text-base font-bold tabular-nums">{(session?.credits ?? 0).toLocaleString()}</span>
      </div>
      <Button size="sm" variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        {t('charge')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t('charge')}</DialogTitle>
            <DialogDescription className="text-xs">{t('credits')} · {(session?.credits ?? 0).toLocaleString()}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {TOPUP_AMOUNTS.map((a) => (
              <Button
                key={a}
                type="button"
                size="sm"
                variant={amount === a ? 'default' : 'outline'}
                onClick={() => setAmount(a)}
                disabled={pending}
              >
                {a.toLocaleString()}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => void purchase()} disabled={pending}>
              {pending ? t('loading') : t('charge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── account row (or login button) ─────────────────────────────────────────

function AccountRow() {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const navigate = useAppStore((s) => s.navigate);
  const setLoginOpen = useAppStore((s) => s.setLoginOpen);
  const { toast } = useToast();

  if (!session) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setLoginOpen(true)}>
        {t('login')}
      </Button>
    );
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* cookie already gone — still clear local session */
    }
    setSession(null);
    navigate('home');
    toast({ title: locale === 'en' ? 'Logged out' : '로그아웃되었습니다' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-8 border">
            {session.avatarUrl && <AvatarImage src={session.avatarUrl} alt={session.username} />}
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
              {session.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{session.username}</span>
            <span className="block text-xs text-muted-foreground">
              {session.role === 'admin' ? t('roleAdmin') : t('roleCreator')}
            </span>
          </span>
          <Icon name="chevron-down" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel>{session.username}</DropdownMenuLabel>
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

// ─── sidebar ───────────────────────────────────────────────────────────────

/** Desktop-only fixed-left navigation (md+). Hidden below md — mobile uses the bottom tab bar. */
export default function Sidebar() {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const session = useAppStore((s) => s.session);
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const { data: modules = [] } = useModules();

  const navItems = modules.filter((m) => (m.adminOnly ? session?.role === 'admin' : true));

  return (
    <aside className="sticky top-0 z-30 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Logo />
      </div>

      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label={t('brand')}>
        {navItems.map((m) => {
          const active = m.entryView === view;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => navigate(m.entryView as ViewKey)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon name={m.icon} className="size-4 shrink-0" />
              <span className="truncate">{moduleTitle(m, locale)}</span>
              <span className="ml-auto inline-flex shrink-0">
                <ModuleStatusBadge status={m.status} newUntil={m.newUntil} />
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t p-3">
        <CreditsWidget />
        <AccountRow />
      </div>
    </aside>
  );
}
