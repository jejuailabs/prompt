'use client';

import { useTranslations } from 'next-intl';
import { Icon } from './icon';

// PLAYLAB brand mark — violet badge icon + wordmark (sidebar / mobile header).
export function Logo({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('core');
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
        <Icon name="zap" className="size-4" />
      </span>
      {!compact && (
        <span className="text-base font-extrabold tracking-tight">{t('brand')}</span>
      )}
    </span>
  );
}
