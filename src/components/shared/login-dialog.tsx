'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { useRefreshSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import { Icon } from '@/components/layout/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { SessionUser } from '@/lib/types';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

/** Self-managed via store `loginOpen` — mounted once in playlab-app. */
export default function LoginDialog() {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const open = useAppStore((s) => s.loginOpen);
  const setOpen = useAppStore((s) => s.setLoginOpen);
  const setSession = useAppStore((s) => s.setSession);
  const refreshSession = useRefreshSession();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const name = username.trim();
    if (!name || pending) return;
    setPending(true);
    try {
      const data = await api.post<SessionUser>('/api/auth/login', { username: name });
      setSession(data);
      refreshSession();
      toast({
        title: locale === 'en' ? `Welcome, ${data.username}!` : `${data.username}님, 환영합니다!`,
      });
      setOpen(false);
      setUsername('');
    } catch (e) {
      toast({ title: t('error'), description: errorMessage(e), variant: 'destructive' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Icon name="zap" className="size-5" />
            </span>
            <div className="text-left">
              <DialogTitle className="text-lg font-extrabold tracking-tight">{t('brand')}</DialogTitle>
              <DialogDescription className="text-xs">{t('tagline')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-3"
        >
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={locale === 'en' ? 'Enter a nickname' : '닉네임을 입력하세요'}
            autoFocus
            maxLength={30}
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">{t('demoAccountHint')}</p>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={pending || !username.trim()}>
              {pending ? t('loading') : t('login')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
