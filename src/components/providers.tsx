'use client';

import { useMemo, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { getMessages } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

export default function Providers({ children }: { children: React.ReactNode }) {
  const locale = useAppStore((s) => s.locale);
  const [queryClient] = useState(() => new QueryClient());
  const messages = useMemo(() => getMessages(locale), [locale]);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale={(locale satisfies Locale) as string} messages={messages} timeZone="Asia/Seoul">
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster />
        </NextIntlClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
