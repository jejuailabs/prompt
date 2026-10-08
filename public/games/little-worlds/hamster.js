import { $, GameShell, canvasSetup, pointerPosition, reducedMotion } from './shared.js';
import { SHOTS, makeBoard, launch, nudge, stepBall, basketX, clamp } from './hamster-rules.mjs';
import { oval, round, text, hamster, cookie, berry } from './animal-art.js';

const canvas = $('canvas'), c = canvasSetup(canvas), shell = new GameShell('hamster-pinball', reset);
let board, ball, aim = 200, score = 0, shot = 0, phase = 'ready', clock = 0, delay = 0, particles = [], accumulator = 0;
function reset() {
  board = makeBoard(); ball = null; score = 0; shot = 0; aim = 200; phase = 'ready'; clock = 0; particles = []; accumulator = 0;
  shell.setScore(0); message('어디로 떨어뜨릴까요? 위치를 정하고 출발!'); update();
}
function message(value) { $('[data-message]').textContent = value; }
function update() {
  $('[data-round]').textContent = `${Math.min(shot + (phase === 'ready' ? 1 : 0), SHOTS)} / ${SHOTS}`;
  $('[data-detail]').textContent = ball ? `${ball.combo}개 간식 · 이번 드롭 ${ball.points}점` : '쿠키 20점 · 딸기 65점부터';
  $('[data-action]').disabled = phase !== 'ready' || shell.finished;
  $('[data-action]').textContent = phase === 'ready' ? `${shot + 1}번째 햄스터 떨어뜨리기` : '간식 모으는 중…';
  for (const b of document.querySelectorAll('[data-nudge]')) { b.disabled = phase !== 'falling' || !ball?.nudges || shell.finished; }
  $('[data-nudges]').textContent = ball && phase === 'falling' ? ball.nudges : 2;
  canvas.setAttribute('aria-label', `햄스터 간식 핀볼 · ${shot}번 드롭 · ${score}점 · ${phase === 'ready' ? '위치 선택 가능' : '떨어지는 중'}`);
}
function drop() {
  if (shell.paused || shell.finished || phase !== 'ready') return;
  ball = launch(aim); shot++; phase = 'falling'; shell.tone(490); message('← → 흔들기는 딱 두 번! 딸기와 바구니를 노려요.'); update();
}
function shake(dir) { if (!shell.paused && !shell.finished && phase === 'falling' && nudge(ball, dir)) { shell.tone(280, .08); update(); } }
canvas.addEventListener('pointermove', event => { if (phase === 'ready' && !shell.paused && !shell.finished) aim = clamp(pointerPosition(event, canvas).x, 26, 374); });
canvas.addEventListener('pointerdown', event => {
  if (shell.paused || shell.finished) return;
  event.preventDefault(); canvas.focus();
  if (phase === 'ready') { aim = clamp(pointerPosition(event, canvas).x, 26, 374); drop(); }
});
$('[data-action]').onclick = drop;
for (const button of document.querySelectorAll('[data-nudge]')) button.onclick = () => shake(Number(button.dataset.nudge));
document.addEventListener('keydown', event => {
  if (shell.paused || shell.finished || event.target.closest('a,input')) return;
  const button = event.target.closest('button');
  if (button && (!button.matches('[data-action],[data-nudge]') || event.key === ' ')) return;
  if (['ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  if (event.key === ' ' && !event.repeat) drop();
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const dir = event.key === 'ArrowLeft' ? -1 : 1;
    if (phase === 'ready') aim = clamp(aim + dir * 9, 26, 374); else if (!event.repeat) shake(dir);
  }
});
function sparkle(x, y, points, color) { particles.push({ x, y, age: 0, points, color }); }
function advance(dt) {
  clock += dt;
  for (const p of particles) p.age += dt;
  particles = particles.filter(p => p.age < 1);
  if (phase === 'falling') {
    const events = stepBall(ball, board, dt, clock);
    for (const e of events) {
      if (e.points) { score += e.points; shell.setScore(score); sparkle(e.x, e.y, e.points, e.berry ? '#ae4a68' : '#987344'); }
      if (e.kind === 'snack') shell.tone(450 + Math.min(ball.combo, 15) * 36, .065, 'triangle');
      if (e.kind === 'land') {
        shell.save(score); phase = 'landed'; delay = 1.15;
        message(e.caught ? '바구니에 쏙! +200점' : '폭신하게 착지! +40점'); shell.tone(e.caught ? 960 : 430, .18);
      }
    }
    if (events.length) update();
  } else if (phase === 'landed') {
    delay -= dt;
    if (delay <= 0) {
      if (shot === SHOTS) { phase = 'ended'; shell.finish(score, '간식 소풍 끝!', `햄스터 다섯 마리와 모은 ${score.toLocaleString()}점\n다음 소풍에는 어느 길로 떨어져 볼까요?`); update(); }
      else { board = makeBoard(); ball = null; phase = 'ready'; message('새로운 간식 배치! 다음 햄스터를 보내주세요.'); update(); }
    }
  }
}
function draw() {
  const bg = c.createLinearGradient(0, 0, 0, 600); bg.addColorStop(0, '#fae7cd'); bg.addColorStop(1, '#e4c7ac'); c.fillStyle = bg; c.fillRect(0, 0, 400, 600);
  // Fabric awning, stitched rails and a little wooden pinball cabinet.
  for (let i = 0; i < 10; i++) { round(c, i * 40, 0, 40, 24, [0, 0, 15, 15], i % 2 ? '#fbf1dc' : '#d7978f'); }
  round(c, 8, 35, 384, 540, 24, '#c38d6c'); round(c, 14, 39, 372, 529, 20, '#fdf4df');
  c.strokeStyle = '#d9b88b'; c.lineWidth = 1; c.setLineDash([3, 5]); c.strokeRect(23, 48, 354, 507); c.setLineDash([]);
  for (let i = 0; i < 10; i++) { oval(c, 10, 90 + i * 42, 5, 10, '#99ad85', -.5); oval(c, 390, 111 + i * 42, 5, 10, '#99ad85', .5); }
  text(c, 'THE LITTLE SNACK PICNIC', 200, 48, 10, '#a07f60', 500);
  for (const snack of board.food) if (!snack.eaten) {
    if (snack.berry) berry(c, snack.x, snack.y, 8); else cookie(c, snack.x, snack.y, 7);
  }
  for (const peg of board.pegs) {
    const hot = clock - peg.lit < .18 && peg.lit > 0;
    oval(c, peg.x, peg.y + 4, peg.r + 2, peg.r, '#85533e18');
    const color = peg.r > 12 ? '#b0c6ae' : '#e5b7c0';
    oval(c, peg.x, peg.y, peg.r, peg.r, hot ? '#f8d68e' : color);
    oval(c, peg.x - 3, peg.y - 4, peg.r * .52, peg.r * .35, '#ffffff55', -.4);
    oval(c, peg.x - 3, peg.y + 2, 1, 1.5, '#846b6a'); oval(c, peg.x + 3, peg.y + 2, 1, 1.5, '#846b6a');
  }
  round(c, 24, 549, 352, 19, 8, '#c59576');
  const bx = basketX(clock, board.phase);
  round(c, bx - 43, 536, 86, 25, [2, 2, 12, 12], '#b98556');
  c.strokeStyle = '#e5be85'; c.lineWidth = 2;
  for (let i = -35; i <= 35; i += 10) { c.beginPath(); c.moveTo(bx + i, 539); c.lineTo(bx + i + 5, 558); c.stroke(); }
  round(c, bx - 46, 533, 92, 7, 3, '#d7ab73'); text(c, '+200', bx, 528, 11, '#a4704e');
  if (phase === 'ready') {
    c.setLineDash([3, 5]); c.strokeStyle = '#bf8d7370'; c.beginPath(); c.moveTo(aim, 83); c.lineTo(aim, 128); c.stroke(); c.setLineDash([]);
    hamster(c, aim, 75, .67);
  } else if (ball) {
    if (!reducedMotion && phase === 'falling') { oval(c, ball.x - ball.vx * .025, ball.y - ball.vy * .025, 13, 12, '#efc37b33'); }
    hamster(c, ball.x, Math.min(ball.y, 530), .72 + Math.min(ball.combo, 20) * .006, reducedMotion ? 0 : ball.vx / 650, phase === 'landed');
  }
  for (const p of particles) { c.globalAlpha = 1 - p.age; text(c, '+' + p.points, p.x, p.y - (reducedMotion ? 0 : p.age * 40), 15, p.color); } c.globalAlpha = 1;
}
reset(); let last = performance.now();
function frame(now) {
  const elapsed = Math.min(.05, (now - last) / 1000); last = now;
  if (!shell.paused && !shell.finished) { accumulator += elapsed; while (accumulator >= 1 / 120) { advance(1 / 120); accumulator -= 1 / 120; if (shell.finished) { accumulator = 0; break; } } }
  else accumulator = 0;
  draw(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
