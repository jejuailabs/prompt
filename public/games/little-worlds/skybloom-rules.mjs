export const W = 480, H = 900, R = 8;
export const BUMPERS = [{ x: 169, y: 205, r: 27 }, { x: 282, y: 211, r: 27 }, { x: 225, y: 302, r: 29 }, { x: 103, y: 397, r: 21 }, { x: 338, y: 352, r: 22 }];
export const LANES = [126, 190, 254, 318];
export const TARGETS = [0, 1, 2].flatMap(i => [{ x: 48, y: 310 + i * 41, side: 0 }, { x: 390, y: 310 + i * 41, side: 1 }]);
export const WALLS = [
  [28, 565, 28, 149], [28, 149, 43, 101], [43, 101, 81, 61], [81, 61, 135, 43],
  [135, 43, 310, 43], [310, 43, 365, 62], [365, 62, 401, 104], [401, 104, 414, 150],
  [414, 150, 414, 565], [28, 565, 59, 617], [59, 617, 142, 675], [414, 565, 382, 617], [382, 617, 308, 675],
];
export const SLINGS = [[[84, 526], [91, 601], [163, 634]], [[358, 526], [351, 601], [277, 634]]];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const STAGES = ['씨앗 정원', '별빛 공방', '천공 정원'];
export const UPPER_BUMPERS = [{ x: 142, y: 110, r: 20 }, { x: 240, y: 75, r: 22 }, { x: 338, y: 110, r: 20 }];
export const UPPER_WALLS = [[46, 225, 46, 65], [46, 65, 90, 30], [90, 30, 390, 30], [390, 30, 434, 65], [434, 65, 434, 225], [46, 225, 145, 260], [434, 225, 335, 260]];

export function progress(s) {
  if (s.phase === 'over') return;
  if (s.stage === 1 && s.score >= 1500) {
    s.stage = 2; s.upgradeAt = s.time; s.multiplier = Math.max(2, s.multiplier);
    emit(s, 'upgrade', 225, 485, '02 · 별빛 공방 완성! 범퍼 + 스피너');
  }
  // A growing object never materializes through an existing ball.
  if (s.stage >= 2 && !s.machinery && s.time - s.upgradeAt > 1 &&
      BUMPERS.slice(3).every(p => s.balls.every(b => b.deck === 1 || Math.hypot(b.x - p.x, b.y - p.y) > p.r + R + 5))) s.machinery = true;
  if (s.stage === 2 && s.score >= 5000) {
    s.stage = 3; s.upgradeAt = s.time;
    const first = s.balls.find(b => b.ramp < 0 && b.deck === 0); if (first) ascend(s, first);
    emit(s, 'upgrade', 225, 485, '03 · 천공 정원 개방! 위층의 별 3개를 모으세요');
  }
  if (s.festivalUntil && s.time >= s.festivalUntil) {
    s.festivalUntil = 0; s.stars.fill(false);
    emit(s, 'notice', 225, 480, '축제 종료 · 별 3개를 다시 모으면 재도전!');
  }
}
export function ascend(s, b) {
  if (s.stage < 3 || s.time < s.tiltUntil) return false;
  b.deck = 1; b.ramp = -1; b.x = 382; b.y = 176; b.vx = -160; b.vy = -130; b.stuck = 0; b.gates.clear();
  emit(s, 'lift', 352, 448, 'UPPER GARDEN'); return true;
}
export function upperFlipper(s, side) {
  const angle = side ? Math.PI - .35 + s.flippers[1] * 1.05 : .35 - s.flippers[0] * 1.05;
  const x = side ? 335 : 145, y = 260;
  return { x, y, ex: x + Math.cos(angle) * 70, ey: y + Math.sin(angle) * 70, omega: s.velocities[side] * (side ? 1.05 : -1.05) };
}
export function collectStar(s, index) {
  if (s.stage < 3 || s.stars[index] || s.time < s.tiltUntil || s.festivalUntil > s.time) return;
  s.stars[index] = true; const p = UPPER_BUMPERS[index];
  award(s, 'star' + index, 600, p.x, p.y, 'STAR ' + s.stars.filter(Boolean).length + ' / 3');
  if (s.stars.every(Boolean)) s.festivalPending = true;
}
export function startFestival(s) {
  if (!s.festivalPending || s.phase === 'over') return;
  s.festivalPending = false; s.stars.fill(false); s.festivals++; s.jackpots = 0; s.jackpotTarget = 0;
  s.festivalUntil = s.time + 35; s.saver = s.time + 8; s.saved = false;
  for (const b of s.balls) if (b.deck === 1) returnDown(s, b);
  while (s.balls.length < 3) { const i = s.balls.length; s.balls.push(ball(s, 100 + i * 100, 160, i % 2 ? 150 : -150, 50)); }
  award(s, 'festival', 2000, 225, 430, 'STARFALL FESTIVAL');
  emit(s, 'multiball', 225, 390, '35초 별빛 축제 · 빛나는 범퍼가 잭팟!');
}
export function collectJackpot(s) {
  if (s.time >= s.festivalUntil || s.time < s.tiltUntil || s.time - (s.flashes.jackpot ?? -9) < .15) return;
  s.jackpots++; s.jackpotTarget = (s.jackpotTarget + 1) % BUMPERS.length;
  award(s, 'jackpot', 800, 225, 420, 'JACKPOT ' + s.jackpots + ' / 6');
  if (s.jackpots % 6 === 0) award(s, 'super', 5000, 225, 470, 'SUPER JACKPOT!');
}
function returnDown(s, b) {
  b.deck = 0; b.x = 113; b.y = 454; b.vx = 130; b.vy = 150; b.ramp = -1; b.rampCooldown = s.time + 1; b.stuck = 0;
  emit(s, 'return', 113, 454, 'RETURN');
}
function stepUpper(s, b, dt) {
  b.vy += 450 * dt; b.vx *= Math.pow(.996, dt * 60); b.x += b.vx * dt; b.y += b.vy * dt;
  for (const wall of UPPER_WALLS) collideSegment(b, ...wall, 4, .7);
  for (let i = 0; i < UPPER_BUMPERS.length; i++) {
    const p = UPPER_BUMPERS[i], dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
    if (d < p.r + R) {
      const nx = d > .001 ? dx / d : 0, ny = d > .001 ? dy / d : -1, dot = b.vx * nx + b.vy * ny;
      b.x = p.x + nx * (p.r + R + .1); b.y = p.y + ny * (p.r + R + .1);
      b.vx += nx * (Math.max(0, -dot) * 1.2 + 180); b.vy += ny * (Math.max(0, -dot) * 1.2 + 180);
      collectStar(s, i); award(s, 'upper' + i, 100, p.x, p.y);
    }
  }
  for (let i = 0; i < 2; i++) {
    const f = upperFlipper(s, i);
    if (collideSegment(b, f.x, f.y, f.ex, f.ey, 9, .65, f) && s.velocities[i] > 2) { b.vy = Math.min(b.vy, -470); b.vx += i ? -60 : 60; }
  }
  const speed = Math.hypot(b.vx, b.vy); if (speed > 750) { b.vx *= 750 / speed; b.vy *= 750 / speed; }
  if (b.y < 20) { b.y = 20; b.vy = Math.abs(b.vy); }
  if (b.x < 34 || b.x > 446) { b.x = clamp(b.x, 34, 446); b.vx *= -.7; }
  if (b.y > 314) returnDown(s, b);
}
export function practiceGame() {
  const s = newGame(); s.stage = 3; s.machinery = true; launch(s); s.phase = 'live'; ascend(s, s.balls[0]); return s;
}
export function newGame() {
  return { score: 0, ballNo: 1, phase: 'ready', time: 0, balls: [], id: 0, multiplier: 1,
    lanes: [false, false, false, false], targets: Array(6).fill(false), orbit: 0, frenzy: 0,
    saver: 0, saved: false, tilt: 0, tiltUntil: 0, nudgeAt: -1, combo: 0, lastHit: -99, lastThing: '',
    flashes: {}, events: [], flippers: [0, 0], velocities: [0, 0], launchClock: 0, charge: 0, stage: 1, upgradeAt: -10, machinery: false, stars: [false, false, false], festivalUntil: 0, festivalPending: false, jackpots: 0, festivals: 0, jackpotTarget: 0, spinnerUntil: 0, skill: true, skillLane: 2 };
}
function emit(s, kind, x, y, label = '') { s.events.push({ kind, x, y, label, time: s.time }); }
function ball(s, x, y, vx, vy) { return { id: ++s.id, x, y, vx, vy, age: 0, deck: 0, ramp: -1, rampCooldown: 0, gates: new Set(), stuck: 0 }; }
export function launch(s, power = .65, rescue = false) {
  if (s.phase !== 'ready' && !rescue) return false;
  if (s.phase === 'over') return false;
  s.phase = 'launch'; s.charge = clamp(power, 0, 1); s.launchClock = 0;
  s.balls = [ball(s, 444, 724, 0, -(1100 + 260 * s.charge))];
  if (!rescue) { s.saver = s.time + 9; s.saved = false; s.skill = true; s.skillLane = (s.ballNo + 1) % 4; }
  emit(s, 'launch', 444, 712, rescue ? 'BALL SAVED' : 'LAUNCH'); return true;
}
export function nudge(s, direction = 1) {
  if (!['live', 'launch'].includes(s.phase) || s.time - s.nudgeAt < .32 || s.time < s.tiltUntil) return false;
  s.nudgeAt = s.time; s.tilt += .47;
  if (s.tilt >= 1) { s.tiltUntil = s.time + 3; s.combo = 0; emit(s, 'tilt', 225, 457, 'TILT · 3s'); return false; }
  for (const b of s.balls) if (b.ramp < 0) { b.vx += Math.sign(direction) * 90; b.vy -= 180; }
  emit(s, 'nudge', 225, 585, 'NUDGE'); return true;
}
function award(s, id, base, x, y, label = '') {
  if (s.time < s.tiltUntil || s.time - (s.flashes[id] ?? -9) < .1) return;
  s.flashes[id] = s.time;
  s.combo = s.time - s.lastHit < 1.4 && id !== s.lastThing ? Math.min(5, s.combo + 1) : 1;
  s.lastHit = s.time; s.lastThing = id;
  const points = base * s.multiplier * (s.frenzy > s.time ? 2 : 1) + (s.combo - 1) * 25;
  s.score += points; emit(s, 'score', x, y, label || '+' + points);
}
export function lightLane(s, index) {
  if (s.time < s.tiltUntil || s.lanes[index]) return;
  if (s.skill) { s.skill = false; if (index === s.skillLane) award(s, 'skill', 400, LANES[index], 90, 'SKILL SHOT'); }
  s.lanes[index] = true; award(s, 'lane' + index, 250, LANES[index], 112);
  if (s.lanes.every(Boolean)) {
    s.multiplier = Math.min(5, s.multiplier + 1); s.lanes.fill(false);
    award(s, 'luna', 750, 225, 390, 'GROW · ×' + s.multiplier);
  }
}
export function hitTarget(s, index) {
  if (s.time < s.tiltUntil || s.targets[index]) return;
  s.targets[index] = true; const target = TARGETS[index]; award(s, 'target' + index, 150, target.x, target.y);
  if (s.targets.every(Boolean)) {
    s.targets.fill(false); s.frenzy = s.time + 20;
    award(s, 'bloom', 1000, 225, 420, 'BLOOM · DOUBLE SCORE');
  }
}
export function enterOrbit(s, b) {
  if (s.time < s.tiltUntil || b.ramp >= 0 || b.rampCooldown > s.time) return false;
  b.ramp = 0; s.orbit++; award(s, 'orbit', 1000, 349, 444, 'SKY LIFT');
  if (s.orbit >= 3) { s.orbit = 0; award(s, 'orbit-bonus', 1500, 225, 386, 'SKY COMBO'); }
  return true;
}
export function rampPosition(t) {
  // Same cubic wireform used by the renderer, traversed from scoop to left return lane.
  const u = 1 - t;
  return { x: u * u * u * 352 + 3 * u * u * t * 505 + 3 * u * t * t * -90 + t * t * t * 105,
    y: u * u * u * 448 + 3 * u * u * t * -35 + 3 * u * t * t * -60 + t * t * t * 409 };
}
export function flipper(s, side) {
  const angle = side ? Math.PI - .43 + s.flippers[1] * .98 : .43 - s.flippers[0] * .98;
  const x = side ? 308 : 142, y = 675;
  // Keep the resting tip gap wider than a ball plus both rubber radii.
  return { x, y, ex: x + Math.cos(angle) * 68, ey: y + Math.sin(angle) * 68, angle, omega: s.velocities[side] * (side ? .98 : -.98) };
}
export function collideSegment(b, x1, y1, x2, y2, radius = 0, restitution = .72, surface = null) {
  const dx = x2 - x1, dy = y2 - y1, length = dx * dx + dy * dy;
  const t = length ? clamp(((b.x - x1) * dx + (b.y - y1) * dy) / length, 0, 1) : 0;
  const x = x1 + t * dx, y = y1 + t * dy, nx0 = b.x - x, ny0 = b.y - y, d = Math.hypot(nx0, ny0), limit = R + radius;
  if (d >= limit) return false;
  const nx = d > .0001 ? nx0 / d : 0, ny = d > .0001 ? ny0 / d : -1;
  b.x = x + nx * (limit + .05); b.y = y + ny * (limit + .05);
  const svx = surface ? -surface.omega * (y - surface.y) : 0, svy = surface ? surface.omega * (x - surface.x) : 0;
  const incoming = (b.vx - svx) * nx + (b.vy - svy) * ny;
  if (incoming < 0) { b.vx -= (1 + restitution) * incoming * nx; b.vy -= (1 + restitution) * incoming * ny; }
  return incoming < 0;
}
export function step(s, dt, controls = {}) {
  if (s.phase === 'over') return;
  s.time += dt; s.events = s.events.filter(e => s.time - e.time < 1.5); s.tilt = Math.max(0, s.tilt - dt * .13);
  for (let i = 0; i < 2; i++) {
    const target = controls[i ? 'right' : 'left'] && s.time >= s.tiltUntil ? 1 : 0;
    const old = s.flippers[i], rate = target ? 22 : 10;
    s.flippers[i] += clamp(target - old, -rate * dt, rate * dt); s.velocities[i] = (s.flippers[i] - old) / dt;
  }
  progress(s);
  if (s.phase === 'ready') return;
  if (s.phase === 'rescue') { s.launchClock -= dt; if (s.launchClock <= 0) launch(s, .7, true); return; }
  if (s.phase === 'launch') {
    const b = s.balls[0]; b.vy += 570 * dt; b.y += b.vy * dt;
    if (b.y < 102) { b.x = 386; b.y = 101; b.vx = -260 - s.charge * 270; b.vy = -85; s.phase = 'live'; }
    return;
  }
  for (const b of [...s.balls]) {
    b.age += dt;
    if (b.deck === 1) { stepUpper(s, b, dt); continue; }
    if (b.ramp >= 0) {
      b.ramp += dt / 1.3; const p = rampPosition(Math.min(1, b.ramp)); b.x = p.x; b.y = p.y;
      if (b.ramp >= 1) { b.ramp = -1; if (s.stage >= 3) ascend(s, b); else { b.vx = 125; b.vy = 310; b.rampCooldown = s.time + 1; } }
      continue;
    }
    b.vy += 570 * dt; const drag = Math.pow(.997, dt * 60); b.vx *= drag; b.vy *= drag;
    b.x += b.vx * dt; b.y += b.vy * dt;
    for (const wall of WALLS) collideSegment(b, ...wall, 4, .65);
    for (let i = 0; i < (s.machinery ? BUMPERS.length : 3); i++) {
      const p = BUMPERS[i], dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
      if (d < p.r + R) {
        const nx = d > .001 ? dx / d : 0, ny = d > .001 ? dy / d : -1;
        b.x = p.x + nx * (p.r + R + .1); b.y = p.y + ny * (p.r + R + .1);
        const dot = b.vx * nx + b.vy * ny;
        b.vx += nx * (Math.max(0, -dot) * 1.1 + 300); b.vy += ny * (Math.max(0, -dot) * 1.1 + 300);
        award(s, 'bumper' + i, 150, p.x, p.y);
        if (s.time < s.festivalUntil && i === s.jackpotTarget) collectJackpot(s);
      }
    }
    if (s.machinery && Math.abs(b.x - 225) < 38 && b.y < 400 && b.y > 386 && b.vy < -80 && s.time > (b.spinnerAt || 0)) {
      b.spinnerAt = s.time + .5; s.spinnerUntil = s.time + 1.2; award(s, 'spinner', 300, 225, 393, 'SPINNER');
    }
    for (let i = 0; i < 5; i++) collideSegment(b, 94 + i * 64, 116, 94 + i * 64, 151, 4, .7);
    for (let i = 0; i < LANES.length; i++) {
      const inLane = Math.abs(b.x - LANES[i]) < 22 && b.y > 88 && b.y < 137;
      if (inLane && !b.gates.has(i)) { lightLane(s, i); b.gates.add(i); }
      if (!inLane) b.gates.delete(i);
    }
    for (let i = 0; i < TARGETS.length; i++) {
      const p = TARGETS[i];
      if (collideSegment(b, p.x, p.y - 11, p.x, p.y + 11, 5, .9)) hitTarget(s, i);
    }
    for (let i = 0; i < SLINGS.length; i++) {
      const v = SLINGS[i]; let hit = false;
      for (let j = 0; j < 3; j++) hit = collideSegment(b, ...v[j], ...v[(j + 1) % 3], 4, .85) || hit;
      if (hit && s.time - (s.flashes['sling' + i] ?? -99) > .16) { b.vx += i ? -150 : 150; b.vy -= 160; award(s, 'sling' + i, 50, v[1][0], v[1][1]); }
    }
    for (let i = 0; i < 2; i++) {
      const f = flipper(s, i);
      const hit = collideSegment(b, f.x, f.y, f.ex, f.ey, 10, .65, f);
      if (hit && s.velocities[i] > 2) { b.vy = Math.min(b.vy, -570); b.vx += i ? -100 : 100; emit(s, 'flip', b.x, b.y); }
    }
    if (b.vy < -80 && Math.hypot(b.x - 352, b.y - 448) < 24) enterOrbit(s, b);
    const speed = Math.hypot(b.vx, b.vy); if (speed > 1250) { b.vx *= 1250 / speed; b.vy *= 1250 / speed; }
    b.stuck = speed < 12 ? b.stuck + dt : 0;
    if (b.stuck > 2.5 && b.y < 620) { b.vx += b.x < 220 ? 65 : -65; b.vy -= 130; b.stuck = 0; }
    // Numerical guard outside the physical cabinet, not an extra scoring surface.
    if (b.y < 27) { b.y = 27; b.vy = Math.abs(b.vy); }
    if (b.y < 680 && (b.x < 17 || b.x > 422)) { b.x = clamp(b.x, 17, 422); b.vx *= -.6; }
  }
  // Equal-mass steel balls exchange normal momentum; wireform balls are above the field.
  for (let i = 0; i < s.balls.length; i++) for (let j = i + 1; j < s.balls.length; j++) {
    const a = s.balls[i], b = s.balls[j];
    if (a.ramp >= 0 || b.ramp >= 0 || a.deck !== b.deck) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= R * 2) continue;
    const nx = d > .001 ? dx / d : 1, ny = d > .001 ? dy / d : 0, overlap = (R * 2 - d + .01) / 2;
    a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
    const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (relative < 0) { const impulse = -.9 * relative; a.vx -= impulse * nx; a.vy -= impulse * ny; b.vx += impulse * nx; b.vy += impulse * ny; }
  }
  if (s.festivalPending) startFestival(s);
  progress(s);
  s.balls = s.balls.filter(b => b.deck === 1 || b.y < 786);
  if (!s.balls.length) {
    if (s.time < s.saver && !s.saved) { s.saved = true; s.phase = 'rescue'; s.launchClock = .6; emit(s, 'save', 225, 575, 'BALL SAVED'); }
    else {
      s.combo = 0; s.festivalUntil = 0;
      if (s.ballNo < 3) { s.ballNo++; s.phase = 'ready'; emit(s, 'drain', 225, 566, 'BALL ' + s.ballNo + ' / 3'); }
      else { s.phase = 'over'; emit(s, 'over', 225, 566, 'FINAL SCORE'); }
    }
  }
}
