import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, launch, step, collideSegment, flipper, lightLane, hitTarget, enterOrbit, nudge } from '../public/games/little-worlds/luna-rules.mjs';
const dt = 1 / 240;
function advance(s, seconds, controls = {}) { for (let t = 0; t < seconds; t += dt) step(s, dt, controls); }
function liveBall(s, x = 224, y = 500, vx = 0, vy = 0) {
  launch(s); s.phase = 'live'; Object.assign(s.balls[0], { x, y, vx, vy }); return s.balls[0];
}
test('all launcher powers enter the field with finite speed', () => {
  for (const power of [0, .3, .65, 1]) {
    const s = newGame(); assert.ok(launch(s, power)); assert.equal(launch(s), false);
    advance(s, 1); assert.equal(s.phase, 'live'); assert.ok(s.balls.length > 0);
    for (const b of s.balls) assert.ok(Number.isFinite(b.x + b.y + b.vx + b.vy));
  }
});
test('rail contact reflects approaching balls but does not accelerate separating balls', () => {
  const b = { x: 12, y: 40, vx: -100, vy: 20 };
  assert.ok(collideSegment(b, 10, 0, 10, 100, 4, .6)); assert.ok(b.x >= 22); assert.equal(b.vx, 60);
  b.x = 20; collideSegment(b, 10, 0, 10, 100, 4, .6); assert.equal(b.vx, 60);
});
test('timed flipper strike sends a falling ball upward; held flipper has no angular velocity', () => {
  const s = newGame(), b = liveBall(s, 183, 679, 0, 210);
  advance(s, .055, { left: true }); assert.ok(b.vy < -400, 'rising flipper gives a strong upward shot');
  advance(s, .1, { left: true }); assert.equal(Math.abs(flipper(s, 0).omega), 0);
  advance(s, .15, {}); assert.equal(s.flippers[0], 0);
});
test('drain uses a single early ball save, then spends exactly three balls', () => {
  const s = newGame(); let b = liveBall(s, 225, 799); step(s, dt);
  assert.equal(s.phase, 'rescue'); assert.equal(s.ballNo, 1); assert.equal(s.saved, true);
  advance(s, 1.7); assert.equal(s.phase, 'live');
  for (let expected = 2; expected <= 3; expected++) {
    s.balls.forEach(b => { b.y = 799; }); step(s, dt); assert.equal(s.ballNo, expected); assert.equal(s.phase, 'ready');
    launch(s); s.phase = 'live'; s.saver = 0;
  }
  b = s.balls[0]; b.y = 799; step(s, dt); assert.equal(s.phase, 'over');
  const score = s.score; assert.equal(launch(s), false); advance(s, 5); assert.equal(s.score, score);
});

test('released flipper tips leave a real drain gap and unattended launches reach the next ball', () => {
  const s = newGame(); const left = flipper(s, 0), right = flipper(s, 1);
  assert.ok(right.ex - left.ex > 2 * (8 + 10));
  for (const power of [.3, .65, 1]) {
    const round = newGame(); launch(round, power); advance(round, 60);
    assert.equal(round.phase, 'ready'); assert.equal(round.ballNo, 2);
  }
  const middle = newGame(); liveBall(middle, 225, 684, 0, 100); middle.saver = 0;
  advance(middle, 2); assert.equal(middle.phase, 'ready'); assert.equal(middle.ballNo, 2);
});
test('LUNA lanes raise the multiplier with a cap, and repeat contacts cannot farm the same lit lane', () => {
  const s = newGame(); lightLane(s, 0); const first = s.score; lightLane(s, 0); assert.equal(s.score, first);
  for (let cycle = 0; cycle < 8; cycle++) {
    for (let lane = 0; lane < 4; lane++) { s.time += .2; lightLane(s, lane); }
  }
  assert.equal(s.multiplier, 5); assert.ok(Number.isInteger(s.score));
});
test('six drop targets enable timed bloom scoring, and tilt suppresses scoring', () => {
  const s = newGame(); for (let i = 0; i < 6; i++) { s.time += .2; hitTarget(s, i); }
  assert.ok(s.frenzy > s.time); assert.equal(s.targets.filter(Boolean).length, 0);
  s.tiltUntil = s.time + 3; const old = s.score; lightLane(s, 0); hitTarget(s, 0); assert.equal(s.score, old);
});
test('three orbit shots award a jackpot and three live balls; one lost multiball does not spend a life', () => {
  const s = newGame(), b = liveBall(s);
  for (let i = 0; i < 3; i++) { s.time += 2; b.ramp = -1; b.rampCooldown = 0; assert.ok(enterOrbit(s, b)); }
  assert.equal(s.balls.length, 3); assert.equal(s.orbit, 0); assert.ok(s.score >= 6000);
  b.ramp = -1; b.y = 799; step(s, dt); assert.equal(s.balls.length, 2); assert.equal(s.ballNo, 1); assert.equal(s.phase, 'live');
});
test('multiball steel balls separate and exchange momentum without creating energy', () => {
  const s = newGame(), a = liveBall(s, 215, 505, 100, 0);
  const b = { ...a, id: 2, x: 230, vx: -100, gates: new Set() }; s.balls.push(b);
  step(s, dt); assert.ok(a.vx < 0 && b.vx > 0);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 16);
  assert.ok(a.vx * a.vx + b.vx * b.vx < 20000);
});

test('rapid nudges cause tilt, released flippers recover after three seconds', () => {
  const s = newGame(); liveBall(s); nudge(s); s.time += .4; nudge(s); s.time += .4; nudge(s);
  assert.ok(s.tiltUntil > s.time); advance(s, .05, { left: true, right: true }); assert.equal(s.flippers[0], 0);
  s.phase = 'ready'; advance(s, 3.1, { left: true }); assert.ok(s.flippers[0] > .9);
});
test('long simulated rounds stay finite and timed controls can sustain scoring rallies', () => {
  let maximum = 0;
  for (let game = 0; game < 12; game++) {
    const s = newGame(); launch(s, .3 + game / 18);
    for (let i = 0; i < 240 * 60 && s.phase !== 'over'; i++) {
      if (s.phase === 'ready') launch(s, .3 + game / 18);
      const low = s.balls.some(b => b.y > 598 && b.y < 708 && b.vy > 10);
      step(s, dt, { left: low && i % 42 < 23, right: low && i % 47 < 26 });
      for (const b of s.balls) { assert.ok(Number.isFinite(b.x + b.y + b.vx + b.vy)); assert.ok(Math.hypot(b.vx, b.vy) < 1400); }
      assert.ok(Number.isInteger(s.score));
    }
    maximum = Math.max(maximum, s.score);
  }
  assert.ok(maximum >= 1500, 'ordinary shots can build a meaningful score');
});
