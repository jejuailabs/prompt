'use client';

import { useTranslations } from 'next-intl';

// PLAYLAB brand mark — violet badge icon + wordmark (sidebar / mobile header).
export function Logo({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('core');
  return (
    <span className="brand-wordmark" data-compact={compact}>{t('brand')}<span>®</span></span>
  );
}
