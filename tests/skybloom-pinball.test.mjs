import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, launch, step, progress, practiceGame, collectStar, startFestival, collectJackpot, ascend, upperFlipper, flipper, BUMPERS } from '../public/games/little-worlds/skybloom-rules.mjs';
const dt = 1 / 240;
function advance(s, seconds, controls = {}) { for (let i = 0; i < seconds * 240; i++) step(s, dt, controls); }
function live(s) { launch(s); s.phase = 'live'; return s.balls[0]; }

test('score thresholds grow the field once and adding machinery cannot overlap a ball', () => {
  const s = newGame(), b = live(s); s.score = 1499; progress(s); assert.equal(s.stage, 1);
  s.score = 1500; progress(s); assert.equal(s.stage, 2); assert.equal(s.multiplier, 2); assert.equal(s.machinery, false);
  s.time += 2; Object.assign(b, BUMPERS[3]); progress(s); assert.equal(s.machinery, false);
  b.x = 220; b.y = 520; progress(s); assert.equal(s.machinery, true);
  s.score = 4999; progress(s); assert.equal(s.stage, 2);
  s.score = 5000; progress(s); assert.equal(s.stage, 3); assert.equal(b.deck, 1);
  const events = s.events.length; progress(s); assert.equal(s.events.length, events);
});
test('upper floor has working flippers, a drain gap, and safe return without spending a ball', () => {
  const s = practiceGame(), b = s.balls[0];
  assert.ok(upperFlipper(s, 1).ex - upperFlipper(s, 0).ex > 36);
  Object.assign(b, { x: 180, y: 265, vx: 0, vy: 150 }); advance(s, .06, { left: true }); assert.ok(b.vy < -300);
  Object.assign(b, { x: 240, y: 313, vx: 0, vy: 180 }); advance(s, .03);
  assert.equal(b.deck, 0); assert.equal(s.ballNo, 1); assert.equal(s.phase, 'live');
  assert.ok(b.y > 430 && b.y < 490);
});
test('ramp returns to the lower field before upgrade and lifts the ball after the upper floor opens', () => {
  for (const stage of [1, 3]) {
    const s = newGame(), b = live(s); s.stage = stage; b.ramp = .99; step(s, .03);
    assert.equal(b.deck, stage === 3 ? 1 : 0); assert.equal(b.ramp, -1);
  }
  const s = newGame(), b = live(s); assert.equal(ascend(s, b), false);
});
test('three distinct upper stars unlock a timed multiball; repeat contacts do not count', () => {
  const s = practiceGame(); collectStar(s, 0); const score = s.score; collectStar(s, 0); assert.equal(s.score, score);
  collectStar(s, 1); assert.equal(s.festivalPending, false); collectStar(s, 2); assert.equal(s.festivalPending, true);
  startFestival(s); assert.equal(s.balls.length, 3); assert.ok(s.balls.every(b => b.deck === 0));
  assert.equal(s.festivalUntil, s.time + 35); assert.equal(s.festivals, 1);
  startFestival(s); assert.equal(s.festivals, 1);
  s.time += 36; progress(s); assert.equal(s.festivalUntil, 0); assert.deepEqual(s.stars, [false, false, false]);
});
test('six lit jackpot shots award a super jackpot and tilt prevents collection', () => {
  const s = practiceGame(); s.festivalPending = true; startFestival(s); const before = s.score;
  for (let i = 0; i < 6; i++) { s.time += .2; collectJackpot(s); }
  assert.equal(s.jackpots, 6); assert.ok(s.score - before >= 9800);
  s.tiltUntil = s.time + 3; const score = s.score; collectJackpot(s); collectStar(s, 1);
  assert.equal(s.score, score); assert.equal(s.jackpots, 6);
});
test('floor upgrades persist across drains, but a new ranked round resets all construction', () => {
  const s = newGame(), b = live(s); s.score = 2000; progress(s); s.saver = 0; b.y = 800; step(s, dt);
  assert.equal(s.stage, 2); assert.equal(s.phase, 'ready'); assert.equal(s.ballNo, 2);
  const fresh = newGame(); assert.equal(fresh.stage, 1); assert.equal(fresh.score, 0); assert.equal(fresh.machinery, false); assert.equal(fresh.festivals, 0);
});
test('unattended balls drain naturally at every floor without NaN or an immortal center trap', () => {
  assert.ok(flipper(newGame(), 1).ex - flipper(newGame(), 0).ex > 36);
  for (const stage of [1, 2, 3]) {
    const s = stage === 3 ? practiceGame() : newGame(); if (stage < 3) launch(s, .3);
    s.stage = stage; s.machinery = stage > 1; advance(s, 90);
    assert.equal(s.phase, 'ready'); assert.equal(s.ballNo, 2);
    assert.ok(Number.isInteger(s.score));
  }
});
test('long rallies in every construction stage remain bounded and keep active balls on their own floor', () => {
  let maximum = 0;
  for (let game = 0; game < 12; game++) {
    const s = game % 3 === 2 ? practiceGame() : newGame();
    if (s.phase === 'ready') launch(s, .3 + game / 18);
    if (game % 3 === 1) { s.stage = 2; s.score = 1500; s.machinery = true; }
    for (let i = 0; i < 240 * 90 && s.phase !== 'over'; i++) {
      if (s.phase === 'ready') launch(s, .3 + game / 18);
      const near = s.balls.some(b => b.vy > 0 && (b.deck === 1 ? b.y > 212 : b.y > 605));
      step(s, dt, { left: near && i % 39 < 20, right: near && i % 45 < 22 });
      for (const b of s.balls) { assert.ok(Number.isFinite(b.x + b.y + b.vx + b.vy)); assert.ok(Math.hypot(b.vx, b.vy) < 1500); }
      assert.ok(s.balls.length <= 3); assert.ok(Number.isInteger(s.score));
    }
    maximum = Math.max(maximum, s.score);
  }
  assert.ok(maximum > 5000);
});
