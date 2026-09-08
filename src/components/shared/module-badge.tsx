'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

/**
 * Module status chip used in nav lists.
 * - 'new' (and newUntil still in the future) → violet NEW badge
 * - 'beta' → outline BETA badge
 * - 'coming-soon' → muted 준비 중 badge
 * - 'active' / anything else → nothing
 */
export function ModuleStatusBadge({ status, newUntil }: { status: string; newUntil?: string | null }) {
  const t = useTranslations('core');

  if (status === 'new' && newUntil && new Date(newUntil).getTime() > Date.now()) {
    return (
      <Badge className="border-transparent bg-primary px-1.5 py-0 text-[10px] text-primary-foreground">
        {t('newBadge')}
      </Badge>
    );
  }
  if (status === 'beta') {
    return (
      <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground">
        {t('betaBadge')}
      </Badge>
    );
  }
  if (status === 'coming-soon') {
    return (
      <Badge variant="secondary" className="border-transparent px-1.5 py-0 text-[10px] text-muted-foreground">
        {t('comingSoon')}
      </Badge>
    );
  }
  return null;
}
