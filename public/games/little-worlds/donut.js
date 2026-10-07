import { $, GameShell, canvasSetup, reducedMotion } from './shared.js';
import { normalizeAngle, judgeTopping, donutFor } from './donut-rules.mjs';

const canvas = $('canvas'), ctx = canvasSetup(canvas), shell = new GameShell('donut-pop', reset);
const frostings = ['#edacc1', '#bcd6b3', '#c6b4df', '#f1ce89', '#aacae0'];
let recipe, rotation = 0, time = 0, placed = 0, finishedDonuts = 0, score = 0;
let flying = null, particles = [], transition = 0, wobble = 0, message = '';
const CENTER = { x: 200, y: 242 }, RADIUS = 111;

function reset() {
  rotation = 0; time = 0; placed = 0; finishedDonuts = 0; score = 0;
  flying = null; particles = []; transition = 0; wobble = 0;
  recipe = donutFor(0); shell.setScore(0); message = '빈틈을 보고 토핑을 톡!'; update();
}
function update() {
  $('[data-donuts]').textContent = finishedDonuts;
  $('[data-left]').textContent = Math.max(0, recipe.goal - placed);
  $('[data-message]').textContent = message;
  $('[data-action]').disabled = Boolean(flying || transition || shell.finished);
  $('[data-end]').disabled = score === 0 || shell.finished;
  canvas.setAttribute('aria-label', `도넛 플레이 영역 · 남은 토핑 ${recipe.goal - placed}개 · ${score}점`);
}
function shoot() {
  if (shell.paused || shell.finished || flying || transition) return;
  flying = { progress: 0 }; shell.tone(430, .07, 'triangle'); update();
}
function end() {
  if (shell.finished || shell.paused || score <= 0) return;
  shell.finish(score, '달콤한 기록!', `${finishedDonuts}개 완성 · ${score.toLocaleString()}점\n다음 도넛은 조금 더 정확하게!`);
  update();
}
function impact() {
  const angle = normalizeAngle(Math.PI / 2 - rotation);
  const result = judgeTopping(angle, recipe.toppings, recipe.berryAngle);
  flying = null;
  if (!result.hit) {
    shell.tone(160, .2); wobble = .4; message = '앗, 토핑에 부딪혔어요!';
    shell.finish(score, '한 입만 더!', `${finishedDonuts}개 완성 · ${score.toLocaleString()}점\n작은 빈틈을 노리면 더 높은 기록을 만들 수 있어요.`); update(); return;
  }
  recipe.toppings.push(angle); placed++; score += result.points;
  if (result.berry) recipe.berryAngle = null;
  for (let i = 0; i < (reducedMotion ? 0 : 10); i++) particles.push({ x: 200, y: 353, vx: (Math.random() - .5) * 160, vy: -60 - Math.random() * 90, life: .7, color: frostings[i % 5] });
  message = result.berry ? '딸기 보너스! +80점' : '톡! +30점';
  shell.tone(result.berry ? 860 : 610, .1); shell.setScore(score); shell.save(score);
  if (placed === recipe.goal) {
    finishedDonuts++; score += 100; shell.setScore(score); shell.save(score);
    message = '도넛 완성! +100점'; transition = .8; shell.tone(980, .2, 'triangle');
  }
  update();
}
function topping(angle, color) {
  ctx.save(); ctx.translate(CENTER.x, CENTER.y); ctx.rotate(angle);
  ctx.fillStyle = '#bd8164'; ctx.beginPath(); ctx.roundRect(RADIUS - 4, -4, 53, 8, 4); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(RADIUS + 7, -4, 42, 8, 4); ctx.fill();
  ctx.fillStyle = '#fff8'; ctx.fillRect(RADIUS + 12, -3, 24, 2); ctx.restore();
}
function strawberry(angle) {
  ctx.save(); ctx.translate(CENTER.x + Math.cos(angle) * 92, CENTER.y + Math.sin(angle) * 92); ctx.rotate(angle - Math.PI / 2);
  ctx.fillStyle = '#dd7389'; ctx.beginPath(); ctx.moveTo(0, 13); ctx.bezierCurveTo(-27, -7, -15, -25, 0, -16); ctx.bezierCurveTo(15, -25, 27, -7, 0, 13); ctx.fill();
  ctx.fillStyle = '#6b9976'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-13, -23); ctx.lineTo(-3, -21); ctx.lineTo(0, -27); ctx.lineTo(5, -20); ctx.lineTo(14, -21); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff1bf'; for (const [x, y] of [[-6, -7], [5, -7], [0, 3]]) ctx.fillRect(x, y, 2, 3); ctx.restore();
}
function draw() {
  ctx.clearRect(0, 0, 400, 600);
  const bg = ctx.createLinearGradient(0, 0, 0, 600); bg.addColorStop(0, '#fae9dc'); bg.addColorStop(1, '#f8edcf'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 400, 600);
  ctx.fillStyle = '#ffffff50'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((i * 83 + 27) % 400, (i * 109 + 20) % 600, 24 + i % 3 * 8, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#d8b6a044'; ctx.fillRect(0, 480, 400, 120);
  ctx.fillStyle = '#fff9'; for (let i = 0; i < 400; i += 32) ctx.fillRect(i, 480, 16, 120);
  ctx.strokeStyle = '#e4ac9944'; for (let i = 480; i < 600; i += 25) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(400, i); ctx.stroke(); }
  ctx.fillStyle = '#fffdf3'; ctx.shadowColor = '#b3916850'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.ellipse(200, 254, 174, 170, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#e2c7a2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(200, 254, 155, 152, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); if (wobble && !reducedMotion) ctx.translate(Math.sin(time * 90) * wobble * 8, 0);
  ctx.translate(CENTER.x, CENTER.y); ctx.rotate(rotation);
  ctx.fillStyle = '#b87949'; ctx.shadowColor = '#8f603434'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 7; ctx.beginPath(); ctx.arc(0, 0, RADIUS, 0, Math.PI * 2); ctx.arc(0, 0, 35, 0, Math.PI * 2, true); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#e9bc81'; ctx.beginPath(); ctx.arc(0, -3, RADIUS - 2, 0, Math.PI * 2); ctx.arc(0, -3, 35, 0, Math.PI * 2, true); ctx.fill();
  ctx.fillStyle = frostings[finishedDonuts % 5]; ctx.beginPath();
  for (let i = 0; i <= 90; i++) { const a = i / 90 * Math.PI * 2, r = 101 + Math.sin(a * 9) * 4; if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r - 3); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - 3); }
  ctx.closePath(); ctx.moveTo(39, -3); ctx.arc(0, -3, 39, 0, Math.PI * 2, true); ctx.fill('evenodd');
  ctx.lineCap = 'round'; ctx.lineWidth = 4;
  for (let i = 0; i < 25; i++) { const a = i * 2.399, r = 57 + i % 4 * 12, x = Math.cos(a) * r, y = Math.sin(a) * r - 3; ctx.strokeStyle = ['#fff4cb', '#e27a99', '#fffaf5', '#83b8a4'][i % 4]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(i) * 7, y + Math.sin(i) * 7); ctx.stroke(); }
  ctx.restore();
  for (let i = 0; i < recipe.toppings.length; i++) topping(recipe.toppings[i] + rotation, i % 2 ? '#c99bdb' : '#7cbea9');
  if (recipe.berryAngle !== null) strawberry(recipe.berryAngle + rotation);
  ctx.fillStyle = '#755344'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('완성 도넛 ' + finishedDonuts + '  ·  남은 토핑 ' + Math.max(0, recipe.goal - placed), 200, 40);
  ctx.save(); ctx.strokeStyle = '#b98c7266'; ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.moveTo(200, 422); ctx.lineTo(200, 505); ctx.stroke(); ctx.restore();
  if (!shell.finished && !transition) {
    const y = flying ? 532 - flying.progress * 185 : 532;
    ctx.fillStyle = '#bb7f64'; ctx.beginPath(); ctx.roundRect(196, y - 30, 8, 61, 4); ctx.fill();
    ctx.fillStyle = '#91c8b6'; ctx.beginPath(); ctx.roundRect(196, y - 30, 8, 45, 4); ctx.fill(); ctx.fillStyle = '#fff9'; ctx.fillRect(197, y - 26, 2, 30);
  }
  for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
  if (transition) { ctx.font = 'bold 24px Georgia'; ctx.fillStyle = '#a06877'; ctx.fillText('SWEET! +100', 200, 457); }
}
canvas.addEventListener('pointerdown', event => { event.preventDefault(); shoot(); });
$('[data-action]').onclick = shoot; $('[data-end]').onclick = end;
document.addEventListener('keydown', event => {
  if (event.target instanceof HTMLElement && event.target.closest('button,a')) return;
  if (event.key === ' ' && !event.repeat) { event.preventDefault(); shoot(); }
});
reset(); let last = performance.now();
function frame(now) {
  const dt = Math.min(.035, (now - last) / 1000); last = now;
  if (!shell.paused && !shell.finished) {
    time += dt; rotation += recipe.direction * recipe.speed * (1 + Math.sin(time * 1.3 + recipe.phase) * .38) * dt;
    if (transition) { transition = Math.max(0, transition - dt); if (!transition) { placed = 0; rotation = 0; recipe = donutFor(finishedDonuts); message = '새 도넛! 회전 리듬을 읽어보세요.'; update(); } }
    if (flying) { flying.progress += dt / .18; if (flying.progress >= 1) impact(); }
    wobble = Math.max(0, wobble - dt);
    for (const p of particles) { p.life -= dt; p.vy += dt * 160; p.x += dt * p.vx; p.y += dt * p.vy; } particles = particles.filter(p => p.life > 0);
  }
  draw(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
