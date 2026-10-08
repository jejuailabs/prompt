export const SHOTS = 5;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function makeBoard(rng = Math.random) {
  const pegs = [], food = [];
  for (let row = 0; row < 5; row++) {
    const offset = row % 2 ? 35 : 0;
    for (let col = 0; col < (row % 2 ? 4 : 5); col++) {
      const x = 58 + col * 71 + offset, y = 158 + row * 68;
      pegs.push({ x: x + (rng() - .5) * 12, y, r: row === 2 ? 17 : 12, lit: 0 });
    }
  }
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const x = 38 + col * 65 + (row % 2 ? 8 : 0), y = 114 + row * 68;
      food.push({ x, y, berry: rng() < .18, eaten: false });
    }
  }
  return { pegs, food, phase: rng() * Math.PI * 2 };
}

export function launch(x) {
  return { x: clamp(x, 26, 374), y: 65, vx: 0, vy: 35, age: 0, combo: 0, points: 0, nudges: 2, done: false };
}
export function nudge(ball, direction) {
  if (!ball || ball.done || ball.nudges <= 0) return false;
  ball.vx = clamp(ball.vx + Math.sign(direction) * 135, -290, 290);
  ball.nudges--; return true;
}
export function basketX(time, phase) { return 200 + Math.sin(time * 1.25 + phase) * 106; }

// Advance at 120 Hz from the renderer; collision response separates overlapping circles first.
export function stepBall(ball, board, dt, time) {
  if (ball.done) return [];
  const events = []; ball.age += dt; ball.vy = Math.min(430, ball.vy + 355 * dt);
  ball.x += ball.vx * dt; ball.y += ball.vy * dt;
  if (ball.x < 19 || ball.x > 381) { ball.x = clamp(ball.x, 19, 381); ball.vx *= -.8; }
  if (ball.y < 40) { ball.y = 40; ball.vy = Math.abs(ball.vy); }
  for (const peg of board.pegs) {
    const dx = ball.x - peg.x, dy = ball.y - peg.y, distance = Math.hypot(dx, dy), radius = 16 + peg.r;
    if (distance >= radius) continue;
    const nx = distance > .001 ? dx / distance : .2, ny = distance > .001 ? dy / distance : -Math.sqrt(.96);
    ball.x = peg.x + nx * (radius + .1); ball.y = peg.y + ny * (radius + .1);
    const speed = ball.vx * nx + ball.vy * ny;
    if (speed < 0) {
      ball.vx -= 1.72 * speed * nx; ball.vy -= 1.72 * speed * ny;
      // A perfectly central hit still rolls off instead of balancing forever.
      if (Math.abs(ball.vx) < 12) ball.vx += (peg.x < 200 ? 1 : -1) * 23;
      peg.lit = time; events.push({ kind: 'bump', x: peg.x, y: peg.y });
    }
  }
  for (const snack of board.food) {
    if (snack.eaten || Math.hypot(ball.x - snack.x, ball.y - snack.y) > 26) continue;
    snack.eaten = true; ball.combo++;
    const points = (snack.berry ? 65 : 20) + Math.min(ball.combo - 1, 12) * 5;
    ball.points += points; events.push({ kind: 'snack', x: snack.x, y: snack.y, points, berry: snack.berry });
  }
  // Slow trapped bounces receive a gentle downward assist after eight seconds.
  if (ball.age > 8) ball.vy = Math.max(ball.vy, 95);
  if (ball.y > 534 || ball.age >= 13) {
    const caught = ball.y > 534 && Math.abs(ball.x - basketX(time, board.phase)) < 42;
    const points = caught ? 200 : 40; ball.points += points; ball.done = true;
    events.push({ kind: 'land', x: ball.x, y: 537, points, caught });
  }
  return events;
}
