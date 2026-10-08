import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, launch, nudge, stepBall, basketX } from '../public/games/little-worlds/hamster-rules.mjs';
import { newIceGame, key, stone, movePlayer, iceAction, tickIce, collectFish, checkContact, enemyStep } from '../public/games/little-worlds/penguin-rules.mjs';

function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
test('every sampled hamster path finishes, stays finite, and scores each snack at most once', () => {
  for (let seed = 1; seed <= 35; seed++) for (const x of [26, 95, 160, 200, 275, 374]) {
    const board = makeBoard(seeded(seed)), ball = launch(x); let total = 0, snacks = 0, lands = 0;
    for (let step = 0; step < 1700 && !ball.done; step++) {
      if (step === 200 || step === 350) nudge(ball, seed % 2 ? 1 : -1);
      for (const e of stepBall(ball, board, 1 / 120, step / 120)) { total += e.points ?? 0; snacks += e.kind === 'snack'; lands += e.kind === 'land'; }
      assert.ok(Number.isFinite(ball.x + ball.y + ball.vx + ball.vy));
    }
    assert.equal(ball.done, true); assert.equal(total, ball.points); assert.equal(lands, 1);
    assert.equal(snacks, board.food.filter(f => f.eaten).length);
    assert.deepEqual(stepBall(ball, board, 1, 100), []);
  }
});
test('a ball gets exactly two nudges; basket catches use the landing time', () => {
  const ball = launch(200); assert.ok(nudge(ball, -1)); assert.ok(nudge(ball, 1)); assert.equal(nudge(ball, 1), false);
  const board = { pegs: [], food: [], phase: 0 }, time = 1;
  ball.x = basketX(time, 0); ball.y = 535; ball.vy = 0;
  const [event] = stepBall(ball, board, .001, time); assert.equal(event.caught, true); assert.equal(ball.points, 200);
  const miss = launch(26); miss.y = 535; stepBall(miss, board, .001, time); assert.equal(miss.points, 40);
});
test('central peg collision escapes and a repeated contact cannot farm snacks', () => {
  const board = { pegs: [{ x: 200, y: 158, r: 12 }], food: [{ x: 200, y: 116, berry: false, eaten: false }], phase: 0 }, ball = launch(200);
  let eaten = 0;
  for (let step = 0; step < 1700 && !ball.done; step++) eaten += stepBall(ball, board, 1 / 120, step / 120).filter(e => e.kind === 'snack').length;
  assert.equal(eaten, 1); assert.equal(ball.done, true);
});
test('random ice maps place fish in traversable cells and preserve safe starts', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const s = newIceGame(seeded(seed)); assert.equal(s.fish.size, 18); assert.equal(s.enemies.length, 2);
    for (const cell of s.fish) { assert.equal(stone(cell % 11, Math.floor(cell / 11)), false); assert.equal(s.ice.has(cell), false); }
    assert.equal(s.ice.has(key(2, 1)), false); assert.equal(s.ice.has(key(1, 2)), false);
  }
});
test('ice ray builds and breaks in the facing direction, stops before seals, and melts', () => {
  const s = newIceGame(seeded(3)); s.ice.clear(); s.enemies = [{ x: 5, y: 1 }];
  assert.equal(iceAction(s), 3); assert.ok(s.ice.has(key(4, 1))); assert.equal(s.ice.has(key(5, 1)), false);
  assert.equal(movePlayer(s, 1), false); assert.equal(iceAction(s), 0);
  s.actionCooldown = 0; assert.equal(iceAction(s), -3); assert.equal(s.ice.size, 0);
  s.actionCooldown = 0; iceAction(s); s.enemies = [];
  for (let i = 0; i < 151; i++) tickIce(s, .1);
  assert.equal(s.ice.size, 0); assert.equal(s.done, false);
});
test('fish combo expires and board completion awards one bonus and resets fish', () => {
  const s = newIceGame(seeded(7)); s.fish = new Set([key(1, 1), key(2, 1), key(3, 1)]);
  assert.equal(collectFish(s), 30); s.player.x = 2; s.elapsed = 1; assert.equal(collectFish(s), 40);
  s.player.x = 3; s.elapsed = 5; assert.equal(collectFish(s), 30);
  assert.equal(s.score, 350); assert.equal(s.wave, 2); assert.equal(s.fish.size, 18);
  assert.equal(collectFish(s), 0); assert.equal(s.score, 350);
});
test('contact shield prevents repeated hits; moving into a seal also hurts; time ends the round', () => {
  const s = newIceGame(); s.ice.clear(); s.shield = 0; s.enemies = [{ x: 2, y: 1 }];
  movePlayer(s, 1); assert.equal(s.hearts, 2); checkContact(s); assert.equal(s.hearts, 2);
  s.shield = 0; checkContact(s); assert.equal(s.hearts, 1); s.shield = 0; checkContact(s); assert.equal(s.done, true);
  const end = newIceGame(); end.time = .01; tickIce(end, .02); assert.equal(end.done, true); assert.equal(end.time, 0);
  const before = JSON.stringify(end.player); assert.equal(movePlayer(end, 1), false); assert.equal(JSON.stringify(end.player), before);
});
test('seals route around ice instead of walking through it', () => {
  const s = newIceGame(() => .5); s.player = { x: 1, y: 3, dir: 1 }; s.ice.clear(); s.ice.set(key(2, 3), 0); s.enemies = [{ x: 3, y: 3 }];
  for (let i = 0; i < 10; i++) { enemyStep(s); assert.equal(s.ice.has(key(s.enemies[0].x, s.enemies[0].y)), false); }
  assert.deepEqual(s.enemies[0], { x: 1, y: 3 });
});
