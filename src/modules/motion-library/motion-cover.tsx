'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import type { MotionItem } from './catalogue';
import { paintCover } from './cover-art';
import styles from './motion.module.css';

/** Concept cover drawn in SVG. It illustrates the effect; it is not a render of the source scene. */
export function MotionCover({ item, index, large = false }: { item: MotionItem; index: number; large?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [colors, setColors] = useState<{ bg: string; ink: string } | null>(null);
  useLayoutEffect(() => { if (ref.current) setColors(paintCover(ref.current, item, index)); }, [item, index]);
  return (
    <div className={styles.cover} data-large={large || undefined} style={colors ? { background: colors.bg, color: colors.ink } : undefined}>
      <svg ref={ref} viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" />
      <span className={styles.coverBadge}>CONCEPT COVER</span>
      <span className={styles.coverLabel}>{item.coverLabel}</span>
    </div>
  );
}
