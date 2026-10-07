const TAU = Math.PI * 2;
export const normalizeAngle = angle => ((angle % TAU) + TAU) % TAU;
export function angleDistance(a, b) {
  const distance = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(distance, TAU - distance);
}
export function judgeTopping(angle, toppings, berryAngle = null) {
  if (!Number.isFinite(angle)) return { hit: false, points: 0, berry: false };
  if (toppings.some(other => angleDistance(angle, other) < .21)) return { hit: false, points: 0, berry: false };
  const berry = berryAngle !== null && angleDistance(angle, berryAngle) < .14;
  return { hit: true, points: berry ? 80 : 30, berry };
}
export function donutFor(index, rng = Math.random) {
  const seeded = Math.min(5, 2 + Math.floor(index / 3));
  const offset = rng() * TAU;
  return {
    toppings: Array.from({ length: seeded }, (_, i) => normalizeAngle(offset + i * TAU / seeded)),
    berryAngle: normalizeAngle(offset + Math.PI / seeded),
    goal: Math.min(10, 6 + Math.floor(index / 2)),
    speed: Math.min(2.4, .78 + index * .105 + rng() * .26),
    direction: index % 2 ? -1 : 1,
    phase: rng() * TAU,
  };
}
