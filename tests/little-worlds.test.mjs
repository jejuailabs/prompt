import test from 'node:test';
import assert from 'node:assert/strict';
import { FruitWorld, RADII } from '../public/games/little-worlds/fruit-physics.mjs';
import { judgeCatch, catchPoints } from '../public/games/little-worlds/fishing-rules.mjs';

test('two touching equal fruits merge once and conserve their midpoint', () => {
  const events = [];
  const world = new FruitWorld((body, points) => events.push({ level: body.level, points }));
  world.add(0, 180, 400); world.add(0, 205, 400); world.step(1 / 60);
  assert.equal(world.bodies.length, 1);
  assert.equal(world.bodies[0].level, 1);
  assert.equal(world.bodies[0].x, 192.5);
  assert.deepEqual(events, [{ level: 1, points: 10 }]);
});
test('one fruit cannot be consumed by two neighbours during the same step', () => {
  const world = new FruitWorld();
  world.add(0, 180, 400); world.add(0, 201, 400); world.add(0, 220, 400);
  world.step(1 / 60);
  assert.deepEqual(world.bodies.map(b => b.level).sort(), [0, 1]);
});
test('final watermelons collide without creating an undefined fruit', () => {
  const world = new FruitWorld(); world.add(8, 160, 410); world.add(8, 240, 410);
  for (let i = 0; i < 120; i++) world.step(1 / 60);
  assert.equal(world.bodies.length, 2);
  assert.ok(world.bodies.every(b => b.level === RADII.length - 1 && Number.isFinite(b.x) && Number.isFinite(b.y)));
});
test('a falling fruit stays inside the container and settles on its floor', () => {
  const world = new FruitWorld(); const body = world.add(3, -100, 50); body.vx = -200;
  for (let i = 0; i < 300; i++) world.step(1 / 60);
  assert.ok(body.x - body.r >= 29 - .01); assert.ok(body.x + body.r <= 371 + .01);
  assert.ok(Math.abs(body.y + body.r - 553) < .1); assert.ok(Math.abs(body.vy) < 1);
});
test('new falling fruit does not immediately trigger overflow', () => {
  const world = new FruitWorld(); const body = world.add(0, 200, 80);
  assert.equal(world.isOverflowing(), false);
  body.age = 3; body.vy = 0; assert.equal(world.isOverflowing(), true);
  body.vy = 100; assert.equal(world.isOverflowing(), false);
});
test('a long pile simulation remains finite', () => {
  const world = new FruitWorld();
  for (let i = 0; i < 3000; i++) {
    if (i % 60 === 0) world.add(i % 4, 60 + (i * 37) % 280);
    world.step(1 / 60);
    for (const body of world.bodies) assert.ok([body.x,body.y,body.vx,body.vy,body.r].every(Number.isFinite));
  }
});
test('fishing grades center, success area and misses separately', () => {
  assert.equal(judgeCatch(.5,.5,.3),'perfect');
  assert.equal(judgeCatch(.6,.5,.3),'good');
  assert.equal(judgeCatch(.8,.5,.3),'miss');
});
test('fishing bonus respects misses, perfect catches and capped streak', () => {
  assert.equal(catchPoints(0,'miss',8),0);
  assert.equal(catchPoints(0,'good',1),80);
  assert.equal(catchPoints(0,'perfect',1),144);
  assert.ok(catchPoints(2,'perfect',3)>catchPoints(2,'good',3));
  assert.equal(catchPoints(5,'perfect',100),catchPoints(5,'perfect',6));
});
