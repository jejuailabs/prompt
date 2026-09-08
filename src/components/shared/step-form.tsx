'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Step {
  title: string;
  description?: string;
  content?: ReactNode;
}

/**
 * Vertical numbered step list (violet circles + dashed connector).
 * `footer` renders below all steps, separated with a top border.
 */
export function StepForm({ steps, footer, className }: { steps: Step[]; footer?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <ol className="space-y-0">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            {/* left rail: number circle + dashed connector */}
            <div className="flex flex-col items-center">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              {i < steps.length - 1 && <span className="min-h-8 w-0 flex-1 border-l border-dashed" />}
            </div>
            {/* right: title / description / content */}
            <div className={cn('min-w-0 flex-1 pb-6', i === steps.length - 1 && 'pb-0')}>
              <p className="pt-1 font-medium leading-6">{step.title}</p>
              {step.description && <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>}
              {step.content && <div className="mt-3">{step.content}</div>}
            </div>
          </li>
        ))}
      </ol>
      {footer && <div className="mt-6 border-t pt-4">{footer}</div>}
    </div>
  );
}
