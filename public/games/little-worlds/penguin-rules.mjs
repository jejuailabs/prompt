export const COLS = 11, ROWS = 13, ROUND_SECONDS = 150;
export const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const key = (x, y) => y * COLS + x;
export const inside = (x, y) => x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1;
export function stone(x, y) { return !inside(x, y) || (x % 2 === 0 && y % 2 === 0); }
export function blocked(state, x, y) { return stone(x, y) || state.ice.has(key(x, y)); }
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function newIceGame(rng = Math.random) {
  const state = { player: { x: 1, y: 1, dir: 1 }, enemies: [], ice: new Map(), fish: new Set(),
    score: 0, hearts: 3, time: ROUND_SECONDS, elapsed: 0, wave: 1, combo: 0, lastFish: -99,
    shield: 0, actionCooldown: 0, enemyTimer: 0, done: false, rng };
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
    if (!stone(x, y) && x + y > 5 && rng() < .16) state.ice.set(key(x, y), 0);
  }
  populate(state); return state;
}
export function populate(state) {
  const corners = [{ x: 9, y: 11 }, { x: 9, y: 1 }, { x: 1, y: 11 }, { x: 5, y: 11 }];
  state.enemies = corners.filter(p => distance(p, state.player) > 3).slice(0, Math.min(4, 1 + state.wave));
  for (const enemy of state.enemies) {
    state.ice.delete(key(enemy.x, enemy.y));
    for (const [dx, dy] of DIRECTIONS) state.ice.delete(key(enemy.x + dx, enemy.y + dy));
  }
  state.fish.clear();
  const cells = [];
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
    if (!stone(x, y) && distance({ x, y }, state.player) > 0 && !state.enemies.some(e => e.x === x && e.y === y)) cells.push(key(x, y));
  }
  // Fisher–Yates makes each round a new route, without changing the scoring rules.
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(state.rng() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  for (const cell of cells.slice(0, 18)) { state.fish.add(cell); state.ice.delete(cell); }
  state.shield = 2; state.enemyTimer = 0;
}
export function collectFish(state) {
  const cell = key(state.player.x, state.player.y);
  if (!state.fish.delete(cell)) return 0;
  state.combo = state.elapsed - state.lastFish < 3 ? Math.min(7, state.combo + 1) : 1;
  state.lastFish = state.elapsed; const points = 30 + (state.combo - 1) * 10; state.score += points;
  if (state.fish.size === 0) { state.score += 250; state.wave++; state.ice.clear(); populate(state); }
  return points;
}
export function checkContact(state) {
  if (state.shield > 0 || state.done) return false;
  if (!state.enemies.some(e => e.x === state.player.x && e.y === state.player.y)) return false;
  state.hearts--; state.combo = 0; state.shield = 2.5;
  if (state.hearts <= 0) state.done = true;
  return true;
}
export function movePlayer(state, direction) {
  if (state.done || !DIRECTIONS[direction]) return false;
  state.player.dir = direction; const [dx, dy] = DIRECTIONS[direction];
  const x = state.player.x + dx, y = state.player.y + dy;
  if (blocked(state, x, y)) return false;
  state.player.x = x; state.player.y = y; checkContact(state);
  if (!state.done) collectFish(state); return true;
}
export function iceAction(state) {
  if (state.done || state.actionCooldown > 0) return 0;
  const [dx, dy] = DIRECTIONS[state.player.dir]; let x = state.player.x + dx, y = state.player.y + dy;
  const breaking = state.ice.has(key(x, y)); let changed = 0;
  while (!stone(x, y)) {
    const cell = key(x, y);
    if (breaking) { if (!state.ice.has(cell)) break; state.ice.delete(cell); }
    else {
      if (state.ice.has(cell) || state.enemies.some(e => e.x === x && e.y === y)) break;
      state.ice.set(cell, state.elapsed + 15); // Built ice melts; initial ice lasts until broken.
    }
    changed++; x += dx; y += dy;
  }
  if (changed) state.actionCooldown = .3;
  return breaking ? -changed : changed;
}
export function enemyStep(state) {
  // Breadth-first distances let seals find a route around a freshly built wall.
  const distances = new Map([[key(state.player.x, state.player.y), 0]]), queue = [{ ...state.player }];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], d = distances.get(key(p.x, p.y));
    for (const [dx, dy] of DIRECTIONS) {
      const x = p.x + dx, y = p.y + dy, cell = key(x, y);
      if (blocked(state, x, y) || distances.has(cell)) continue;
      distances.set(cell, d + 1); queue.push({ x, y });
    }
  }
  for (const enemy of state.enemies) {
    const choices = DIRECTIONS.map(([dx, dy]) => ({ x: enemy.x + dx, y: enemy.y + dy }))
      .filter(p => !blocked(state, p.x, p.y));
    if (!choices.length) continue;
    choices.sort((a, b) => (distances.get(key(a.x, a.y)) ?? 999) - (distances.get(key(b.x, b.y)) ?? 999));
    const choice = state.rng() < .2 ? choices[Math.floor(state.rng() * choices.length)] : choices[0];
    enemy.x = choice.x; enemy.y = choice.y;
  }
  checkContact(state);
}
export function tickIce(state, dt) {
  if (state.done) return;
  state.time = Math.max(0, state.time - dt); state.elapsed += dt;
  state.shield = Math.max(0, state.shield - dt); state.actionCooldown = Math.max(0, state.actionCooldown - dt);
  for (const [cell, expiry] of state.ice) if (expiry > 0 && expiry <= state.elapsed) state.ice.delete(cell);
  if (state.time <= 0) { state.done = true; return; }
  state.enemyTimer += dt;
  if (state.enemyTimer >= Math.max(.28, .64 - state.wave * .045)) { state.enemyTimer = 0; enemyStep(state); }
  checkContact(state);
}
