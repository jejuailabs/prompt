import test from 'node:test';
import assert from 'node:assert/strict';
import { angleDistance, judgeTopping, donutFor } from '../public/games/little-worlds/donut-rules.mjs';
import { judgeBridge, platformFor } from '../public/games/little-worlds/bridge-rules.mjs';

test('toppings collide across the zero-angle seam as well as within a rotation', () => {
  assert.ok(angleDistance(.04, Math.PI * 2 - .04) < .09);
  assert.equal(judgeTopping(.04, [Math.PI * 2 - .04]).hit, false);
  assert.equal(judgeTopping(1, [1.2]).hit, false);
  assert.equal(judgeTopping(1, [1.3]).hit, true);
});
test('a strawberry bonus cannot override a topping collision', () => {
  assert.deepEqual(judgeTopping(1, [], 1.08), { hit: true, berry: true, points: 80 });
  assert.deepEqual(judgeTopping(1, [1.1], 1.08), { hit: false, berry: false, points: 0 });
  assert.equal(judgeTopping(1, [], null).points, 30);
  assert.equal(judgeTopping(NaN, []).hit, false);
});
test('donut recipes stay bounded, variable, and have room for every required topping', () => {
  for (let round = 0; round < 200; round++) {
    const recipe = donutFor(round, () => .37);
    assert.ok(recipe.speed >= .78 && recipe.speed <= 2.4);
    assert.ok(recipe.goal >= 6 && recipe.goal <= 10);
    assert.equal(recipe.direction, round % 2 ? -1 : 1);
    let placed = 0;
    for (let i = 0; i < 1000 && placed < recipe.goal; i++) {
      const angle = i / 1000 * Math.PI * 2;
      if (judgeTopping(angle, recipe.toppings).hit) { recipe.toppings.push(angle); placed++; }
    }
    assert.equal(placed, recipe.goal);
  }
  assert.notEqual(donutFor(1, () => .1).phase, donutFor(1, () => .9).phase);
});
test('bridges land only inside the platform, including the exact two edges', () => {
  for (const length of [104, 120, 136, 168]) assert.equal(judgeBridge(length, 104, 64).hit, true);
  for (const length of [0, 103.99, 168.01, Infinity, NaN]) {
    assert.equal(judgeBridge(length, 104, 64).hit, false);
    assert.equal(judgeBridge(length, 104, 64).points, 0);
  }
});
test('bridge accuracy earns a capped perfect streak and an ordinary landing resets it', () => {
  assert.equal(judgeBridge(136, 104, 64).points, 120);
  assert.equal(judgeBridge(141, 104, 64).perfect, true);
  assert.equal(judgeBridge(142, 104, 64).perfect, false);
  assert.equal(judgeBridge(136, 104, 64, 99).points, 200);
  assert.equal(judgeBridge(104, 104, 64, 5).streak, 0);
  assert.equal(judgeBridge(136, 104, 64, 5).streak, 6);
});
test('random bridge platforms fit the visible world and remain reachable after narrow landings', () => {
  for (let crossings = 1; crossings < 200; crossings++) for (const r of [0, .4, .999999]) for (const currentWidth of [34, 64, 86]) {
    const p = platformFor(crossings, () => r, currentWidth);
    assert.ok(p.x + p.width <= 384);
    assert.ok(p.width >= 34);
    assert.equal(p.x - (28 + currentWidth), p.gap);
    assert.equal(judgeBridge(p.gap + p.width / 2, p.gap, p.width).perfect, true);
    assert.ok(p.gap + p.width < 350);
  }
});
