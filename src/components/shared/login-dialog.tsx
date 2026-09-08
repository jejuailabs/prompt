'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Icon } from '@/components/layout/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function LoginDialog() {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const open = useAppStore((s) => s.loginOpen);
  const setOpen = useAppStore((s) => s.setLoginOpen);
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const handleGoogleLogin = async () => {
    if (pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (e) {
      toast({
        title: t('error'),
        description: e instanceof Error ? e.message : 'Login failed',
        variant: 'destructive',
      });
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

        <div className="space-y-4 pt-2">
          <Button
            variant="outline"
            className="w-full gap-3 h-11"
            onClick={handleGoogleLogin}
            disabled={pending}
          >
            <svg className="size-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {pending
              ? (locale === 'en' ? 'Connecting...' : '연결 중...')
              : (locale === 'en' ? 'Continue with Google' : 'Google로 계속하기')}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {locale === 'en'
              ? 'Sign in to save your work and earn credits'
              : '로그인하면 작업을 저장하고 크레딧을 받을 수 있어요'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
