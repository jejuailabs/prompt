export function judgeBridge(length, gap, width, streak = 0) {
  if (![length, gap, width].every(Number.isFinite) || gap <= 0 || width <= 0 || length < gap || length > gap + width) {
    return { hit: false, perfect: false, points: 0, streak: 0 };
  }
  const perfect = Math.abs(length - gap - width / 2) <= 5;
  const nextStreak = perfect ? streak + 1 : 0;
  const accuracy = Math.max(0, 1 - Math.abs(length - gap - width / 2) / (width / 2));
  return { hit: true, perfect, points: perfect ? 100 + Math.min(nextStreak, 5) * 20 : 40 + Math.floor(accuracy * 40), streak: nextStreak };
}
export function platformFor(crossings, rng = Math.random, currentWidth = 78) {
  if (crossings === 0) return { x: 218, width: 64, gap: 104 };
  const width = Math.max(34, 76 - Math.min(crossings, 14) * 2 - Math.floor(rng() * 14));
  const gap = 65 + Math.floor(rng() * Math.min(145, 384 - 28 - currentWidth - width - 65));
  return { x: 28 + currentWidth + gap, width, gap };
}
