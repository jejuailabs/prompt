import { $, GameShell, canvasSetup, reducedMotion } from './shared.js';
import { COLS, ROWS, key, stone, newIceGame, movePlayer, iceAction, tickIce } from './penguin-rules.mjs';
import { oval, round, text, penguin, seal, fish } from './animal-art.js';

const canvas = $('canvas'), c = canvasSetup(canvas), shell = new GameShell('penguin-ice', reset);
let state, started = false, held = new Map(), moveTimer = 0, clock = 0, effects = [], noticeTimer = 0;
const TILE = 32, LEFT = 24, TOP = 111;
const keyDirs = { ArrowUp: 0, w: 0, ArrowRight: 1, d: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3 };
function reset() {
  state = newIceGame(); started = false; held.clear(); moveTimer = 0; clock = 0; effects = [];
  shell.setScore(0); message('준비됐나요? 생선을 모으고 물개를 따돌려요.'); update();
}
function message(value) { $('[data-message]').textContent = value; noticeTimer = 2.5; }
function update() {
  const remaining = Math.ceil(state.time);
  $('[data-round]').textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  $('[data-detail]').textContent = `생선 ${state.fish.size}마리 남음 · ${state.wave}번째 소동`;
  $('[data-hearts]').textContent = '♥'.repeat(state.hearts) + '♡'.repeat(3 - state.hearts);
  $('[data-combo]').textContent = state.combo > 1 && state.elapsed - state.lastFish < 3 ? `${state.combo}연속!` : '3초 안에 모으면 콤보';
  $('[data-action]').textContent = started ? '얼음 만들기 / 깨기' : '소동 시작하기';
  $('[data-action]').disabled = shell.finished;
  for (const button of document.querySelectorAll('[data-dir]')) button.disabled = !started || shell.finished;
  canvas.setAttribute('aria-label', `펭귄 얼음 소동 · ${state.score}점 · 하트 ${state.hearts}개 · ${remaining}초 · 위치 ${state.player.x},${state.player.y}`);
}
function active() { return started && !shell.paused && !shell.finished && !state.done; }
function celebrateChange(before) {
  if (state.score > before.score) {
    const gain = state.score - before.score;
    shell.setScore(state.score); shell.save(state.score); shell.tone(550 + state.combo * 65, .07, 'triangle');
    effects.push({ x: LEFT + state.player.x * TILE + 16, y: TOP + state.player.y * TILE, age: 0, label: '+' + gain, color: '#c16b83' });
    if (state.wave > before.wave) message('싹 모았어요! +250점 · 새 생선이 도착했어요.');
  }
  if (state.hearts < before.hearts) { message('앗, 물개! 반짝이는 동안 서둘러 빠져나와요.'); shell.tone(160, .2); }
  if (state.done && !shell.finished) {
    held.clear(); shell.finish(state.score, state.hearts ? '오늘의 얼음 소동 끝!' : '물개에게 잡혔어요!', `${state.score.toLocaleString()}점 · ${state.wave}번째 소동\n얼음벽으로 길을 바꾸면 더 오래 살아남을 수 있어요.`);
  }
  update();
}
function walk(dir) {
  if (!active()) return;
  const before = { score: state.score, hearts: state.hearts, wave: state.wave };
  movePlayer(state, dir); celebrateChange(before);
}
function action() {
  if (shell.paused || shell.finished) return;
  canvas.focus();
  if (!started) { started = true; message('방향키로 이동 · 스페이스로 얼음벽!'); canvas.focus(); update(); return; }
  const amount = iceAction(state);
  if (amount) {
    shell.tone(amount > 0 ? 720 : 400, .09, 'triangle');
    effects.push({ x: LEFT + state.player.x * TILE + 16, y: TOP + state.player.y * TILE, age: 0, label: amount > 0 ? '❄' : '✦', color: '#548cab' });
  }
}
$('[data-action]').onclick = action;
document.addEventListener('keydown', event => {
  if (event.target.closest('a,input') || shell.paused || shell.finished) return;
  if (event.target.closest('button')) return;
  const dir = keyDirs[event.key];
  if (dir !== undefined) { event.preventDefault(); if (!event.repeat && active()) { held.set(event.key, dir); walk(dir); moveTimer = .14; } }
  if (event.key === ' ' && !event.repeat) { event.preventDefault(); action(); }
});
document.addEventListener('keyup', event => held.delete(event.key));
for (const button of document.querySelectorAll('[data-dir]')) {
  button.addEventListener('pointerdown', event => {
    if (!active() || event.button !== 0) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId); held.set('touch' + event.pointerId, Number(button.dataset.dir));
    walk(Number(button.dataset.dir)); moveTimer = .14;
  });
  const release = event => held.delete('touch' + event.pointerId);
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
  button.addEventListener('click', event => { if (event.detail === 0) walk(Number(button.dataset.dir)); });
}
window.addEventListener('blur', () => held.clear());
document.addEventListener('visibilitychange', () => { if (document.hidden) held.clear(); });
function iceBlock(x, y, permanent, melting = false) {
  const color = permanent ? '#8daab7' : melting ? '#cae4e9' : '#b4dce6';
  round(c, x + 2, y + 5, 28, 27, 6, permanent ? '#708f9f' : '#87bbc9');
  round(c, x + 2, y + 2, 28, 26, 6, color);
  round(c, x + 5, y + 4, 22, 5, 3, permanent ? '#b4cbd3' : '#e8f7f5');
  if (!permanent) {
    c.strokeStyle = '#ffffff99'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x + 8, y + 18); c.lineTo(x + 19, y + 10); c.moveTo(x + 17, y + 23); c.lineTo(x + 24, y + 18); c.stroke();
  } else { oval(c, x + 21, y + 19, 3, 2, '#7496a7'); }
}
function draw() {
  const sky = c.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, '#e8f3ed'); sky.addColorStop(1, '#a6d2db'); c.fillStyle = sky; c.fillRect(0, 0, 400, 600);
  oval(c, 336, 41, 25, 25, '#ffebbb');
  for (let i = 0; i < 5; i++) { oval(c, i * 105 - 18, 78, 70, 24, '#f9fbf4'); oval(c, i * 105 + 20, 81, 35, 15, '#d4e7e6'); }
  text(c, 'PENGUIN’S LITTLE ICE PICNIC', 200, 31, 10, '#638995', 500);
  round(c, 106, 44, 188, 38, 19, '#fff9');
  text(c, started ? `${Math.ceil(state.time)}s   ·   ${state.fish.size} FISH` : 'READY FOR A LITTLE CHASE?', 200, 68, started ? 16 : 10, '#537989');
  text(c, '♥'.repeat(state.hearts) + '♡'.repeat(3 - state.hearts), 62, 71, 16, '#d98d9b');
  round(c, LEFT - 6, TOP - 6, 364, 432, 17, '#7dabb966'); round(c, LEFT - 4, TOP - 9, 360, 432, 14, '#f4fbf4');
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const px = LEFT + x * TILE, py = TOP + y * TILE, cell = key(x, y);
    round(c, px, py, TILE, TILE, 3, (x + y) % 2 ? '#dceff0' : '#e8f5f1');
    if (state.fish.has(cell)) fish(c, px + 17, py + 17, .69);
    if (stone(x, y)) iceBlock(px, py, true);
    else if (state.ice.has(cell)) {
      c.globalAlpha = state.fish.has(cell) ? .8 : 1;
      iceBlock(px, py, false, state.ice.get(cell) > 0 && state.ice.get(cell) - state.elapsed < 3); c.globalAlpha = 1;
      if (state.fish.has(cell)) fish(c, px + 17, py + 17, .45);
    }
  }
  state.enemies.forEach((e, i) => seal(c, LEFT + e.x * TILE + 16, TOP + e.y * TILE + 16, .86, i));
  const px = LEFT + state.player.x * TILE + 16, py = TOP + state.player.y * TILE + 16;
  if (state.shield > 0 && started) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 19, 0, Math.PI * 2); c.stroke(); }
  penguin(c, px, py + 1, .9, state.player.dir, held.size && !reducedMotion && active() ? Math.sin(clock * 20) * 1.6 : 0);
  // A small arrow makes the ice-building direction readable even when standing still.
  const offsets = [[0, -23], [21, 0], [0, 20], [-21, 0]], [dx, dy] = offsets[state.player.dir];
  c.save(); c.translate(px + dx, py + dy); c.rotate(state.player.dir * Math.PI / 2); c.fillStyle = '#ce7990';
  c.beginPath(); c.moveTo(0, -3); c.lineTo(-3, 2); c.lineTo(3, 2); c.fill(); c.restore();
  for (const p of effects) { c.globalAlpha = 1 - p.age; text(c, p.label, p.x, p.y - (reducedMotion ? 0 : p.age * 23), 15, p.color); } c.globalAlpha = 1;
  fish(c, 37, 562, .9, true); text(c, '얼음벽으로 길을 바꾸고, 생선은 연속으로!', 216, 566, 11, '#537b87');
  if (!started) {
    round(c, 77, 250, 246, 128, 20, '#fff9edee'); penguin(c, 145, 290, 1.2); seal(c, 252, 294, 1.2);
    text(c, '생선은 내 거야!', 200, 337, 19, '#527687'); text(c, '아래 버튼을 누르면 시작해요', 200, 361, 11, '#7b969b');
  }
}
reset(); let last = performance.now(), hudTimer = 0;
function frame(now) {
  const dt = Math.min(.04, (now - last) / 1000); last = now;
  if (shell.paused) held.clear();
  if (active()) {
    clock += dt; noticeTimer -= dt;
    if (noticeTimer <= 0) { $('[data-message]').textContent = '얼음벽은 15초 뒤 녹아요 · 생선 전부 모으면 +250'; noticeTimer = 999; }
    const before = { score: state.score, hearts: state.hearts, wave: state.wave };
    tickIce(state, dt);
    if (state.hearts !== before.hearts || state.done) celebrateChange(before);
    moveTimer -= dt;
    if (held.size && moveTimer <= 0) { walk([...held.values()].at(-1)); moveTimer = .14; }
    hudTimer += dt; if (hudTimer > .2) { update(); hudTimer = 0; }
    for (const p of effects) p.age += dt; effects = effects.filter(p => p.age < 1);
  }
  draw(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
