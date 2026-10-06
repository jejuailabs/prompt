'use client';

import type { ReactNode } from 'react';

/** Standard view heading: title + optional subtitle on the left, action buttons on the right. */
export function ViewHeader({ title, subtitle, actions, eyebrow, image }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string; image?: string }) {
  return (
    <section className={`space-heading ${image ? 'space-heading-art' : ''}`}>
      {image && <img className="space-heading-image" src={image} alt="" aria-hidden="true" />}
      <div className="space-heading-copy">
        {eyebrow && <p className="space-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="space-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="space-heading-actions">{actions}</div>}
    </section>
  );
}
