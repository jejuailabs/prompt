'use client';

import { cn } from '@/lib/utils';

function scoreColor(score: number): string {
  if (score >= 70) return '#10b981'; // emerald-500
  if (score >= 40) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

/**
 * Deterministic (SSR-safe) circular gauge, 0–100.
 * Ring track uses `stroke-muted`; the value arc color depends on the score.
 */
export function ScoreGauge({ score, size = 140, label, className }: { score: number; size?: number; label?: string; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${clamped} / 100`}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={8}
          stroke={scoreColor(clamped)}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms ease, stroke 300ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="flex items-baseline gap-0.5">
          <span className="text-3xl font-bold tabular-nums" style={{ fontSize: Math.max(20, size * 0.24) }}>
            {clamped}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </p>
        {label && <p className="mt-0.5 max-w-[80%] truncate text-xs text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}
