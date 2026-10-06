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
import { RuntimeContext } from './runtime-context';

export default function Providers({ children, previewMode = false, authConfigured = false }: { children: React.ReactNode; previewMode?: boolean; authConfigured?: boolean }) {
  const locale = useAppStore((s) => s.locale);
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));
  const messages = useMemo(() => getMessages(locale), [locale]);

  return (
    <RuntimeContext.Provider value={{ previewMode, authConfigured }}><ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale={(locale satisfies Locale) as string} messages={messages} timeZone="Asia/Seoul">
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster />
        </NextIntlClientProvider>
      </QueryClientProvider>
    </ThemeProvider></RuntimeContext.Provider>
  );
}
