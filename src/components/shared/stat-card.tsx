'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Metric tile: label + icon, big value, optional % delta chip and sub caption. */
export function StatCard({
  label,
  value,
  delta,
  icon,
  sub,
  className,
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon?: ReactNode;
  sub?: string;
  className?: string;
}) {
  return (
    <Card className={cn('gap-1 rounded-xl p-4 py-4 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {typeof delta === 'number' && Number.isFinite(delta) && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
              delta >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500',
            )}
          >
            {delta >= 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {Math.abs(Math.round(delta * 10) / 10)}%
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}
