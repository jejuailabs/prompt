import { $, GameShell, canvasSetup, reducedMotion } from './shared.js';
import { judgeBridge, platformFor } from './bridge-rules.mjs';

const canvas = $('canvas'), ctx = canvasSetup(canvas), shell = new GameShell('cat-bridge', reset);
let current, target, length = 0, phase = 'ready', angle = 0, catX = 65, catY = 409;
let score = 0, crossings = 0, streak = 0, clock = 0, timer = 0, result, offset = 0, walkStart = 0;
let pointerId = null, keyboardHeld = false, note = '';
const EDGE_Y = 435;

function reset() {
  current = { x: 28, width: 86 }; target = platformFor(0); length = 0; angle = 0;
  catX = 65; catY = 409; score = 0; crossings = 0; streak = 0; clock = 0; timer = 0;
  phase = 'ready'; offset = 0; pointerId = null; keyboardHeld = false;
  note = '누르고 늘린 뒤, 놓으면 다리가 펼쳐져요.'; shell.setScore(0); update();
}
function update() {
  $('[data-crossings]').textContent = crossings;
  $('[data-combo]').textContent = streak ? streak + ' PERFECT' : '중앙에 놓으면 PERFECT!';
  $('[data-length]').textContent = Math.floor(length);
  $('[data-message]').textContent = note;
  $('[data-action]').textContent = phase === 'growing' ? '손을 떼면 다리 놓기' : '꾹 눌러 다리 늘리기';
  $('[data-action]').disabled = !['ready', 'growing'].includes(phase) || shell.finished;
  $('[data-end]').disabled = score === 0 || shell.finished || !['ready', 'growing'].includes(phase);
  canvas.setAttribute('aria-label', `고양이 다리 플레이 영역 · ${crossings}번 건넘 · 다리 ${Math.floor(length)}픽셀`);
}
function begin() {
  if (shell.paused || shell.finished || phase !== 'ready') return;
  length = 0; phase = 'growing'; note = '고양이가 건널 만큼만, 조금 더…'; update();
}
function release() {
  if (shell.paused || shell.finished || !['ready', 'growing'].includes(phase) || length <= 0) return;
  phase = 'lowering'; pointerId = null; keyboardHeld = false; timer = 0; angle = 0;
  result = judgeBridge(length, target.gap, target.width, streak);
  note = '고양이가 건널 수 있을까요?'; shell.tone(350, .08, 'triangle'); update();
}
function inputDown(event) {
  if (event.button !== 0 || pointerId !== null || !['ready'].includes(phase) || shell.paused || shell.finished) return;
  event.preventDefault(); pointerId = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); begin();
}
function inputUp(event) {
  if (event.pointerId !== pointerId) return;
  event.preventDefault(); const id = pointerId; release(); pointerId = null;
  if (event.currentTarget.hasPointerCapture(id)) event.currentTarget.releasePointerCapture(id);
}
function cancelInput() {
  pointerId = null; keyboardHeld = false;
  if (phase === 'growing') { phase = 'ready'; length = 0; note = '다시 꾹 눌러 다리를 늘려보세요.'; update(); }
}
for (const control of [canvas, $('[data-action]')]) {
  control.addEventListener('pointerdown', inputDown); control.addEventListener('pointerup', inputUp);
  control.addEventListener('pointercancel', cancelInput);
}
document.addEventListener('keydown', event => {
  if (event.target instanceof HTMLElement && event.target.closest('a,input') || shell.paused || shell.finished) return;
  if (event.target instanceof HTMLElement && event.target.closest('button') && event.target !== $('[data-action]')) return;
  if (event.key === ' ' && !event.repeat) { event.preventDefault(); keyboardHeld = true; begin(); }
  if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && phase === 'ready') {
    event.preventDefault(); length = Math.max(0, Math.min(350, length + (event.key === 'ArrowRight' ? 4 : -4))); update();
  }
  if (event.key === 'Enter' && phase === 'ready') { event.preventDefault(); release(); }
});
document.addEventListener('keyup', event => { if (event.key === ' ' && keyboardHeld) { event.preventDefault(); release(); } });
window.addEventListener('blur', cancelInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelInput(); });
$('[data-end]').onclick = () => {
  if (shell.paused || shell.finished || score <= 0 || !['ready', 'growing'].includes(phase)) return;
  shell.finish(score, '작은 산책의 기록', `${crossings}번 건넘 · ${score.toLocaleString()}점\n다음 산책엔 한 발 더 멀리!`); update();
};

function cat(x, y, stride = 0) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = '#dfae77'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-16, 7); ctx.bezierCurveTo(-35, 8, -37, -20, -23, -19); ctx.stroke();
  ctx.fillStyle = '#efc793'; ctx.beginPath(); ctx.ellipse(-2, 4, 19, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dba873'; ctx.beginPath(); ctx.roundRect(-15, 12 + stride, 9, 9, 4); ctx.roundRect(6, 12 - stride, 9, 9, 4); ctx.fill();
  ctx.fillStyle = '#efc793'; ctx.beginPath(); ctx.moveTo(-15, -16); ctx.lineTo(-14, -36); ctx.lineTo(-2, -27); ctx.lineTo(10, -29); ctx.lineTo(24, -37); ctx.lineTo(23, -13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f8d5c5'; ctx.beginPath(); ctx.moveTo(-12, -22); ctx.lineTo(-11, -31); ctx.lineTo(-5, -26); ctx.moveTo(16, -26); ctx.lineTo(21, -32); ctx.lineTo(21, -23); ctx.fill();
  ctx.fillStyle = '#f1ce9f'; ctx.beginPath(); ctx.ellipse(6, -13, 23, 19, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7e5f49'; ctx.beginPath(); ctx.arc(0, -15, 2, 0, Math.PI * 2); ctx.arc(15, -15, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9908f'; ctx.beginPath(); ctx.arc(7, -9, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#9d7c61'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(7, -7); ctx.lineTo(7, -3); ctx.moveTo(-9, -8); ctx.lineTo(-21, -11); ctx.moveTo(22, -8); ctx.lineTo(34, -11); ctx.stroke();
  ctx.fillStyle = '#91b99a'; ctx.beginPath(); ctx.roundRect(-4, 3, 17, 5, 2); ctx.fill();
  ctx.fillStyle = '#e0b65d'; ctx.beginPath(); ctx.arc(7, 9, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function fish(x, y) {
  ctx.fillStyle = '#d99385'; ctx.beginPath(); ctx.ellipse(x, y, 11, 6, 0, 0, Math.PI * 2); ctx.moveTo(x - 8, y); ctx.lineTo(x - 18, y - 7); ctx.lineTo(x - 18, y + 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#68554b'; ctx.beginPath(); ctx.arc(x + 5, y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
}
function platform(p) {
  const x = p.x - offset;
  ctx.fillStyle = '#8c9e7c'; ctx.beginPath(); ctx.roundRect(x, EDGE_Y, p.width, 190, [0, 0, 7, 7]); ctx.fill();
  ctx.fillStyle = '#bec6a1'; ctx.fillRect(x + 5, EDGE_Y + 10, Math.max(0, p.width - 10), 170);
  ctx.strokeStyle = '#9aa987'; ctx.lineWidth = 2;
  for (let y = EDGE_Y + 22; y < 600; y += 26) { ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + p.width - 6, y); ctx.stroke(); }
  ctx.fillStyle = '#719982'; ctx.beginPath(); ctx.roundRect(x - 5, EDGE_Y - 8, p.width + 10, 14, 5); ctx.fill();
  ctx.fillStyle = '#bad49b'; ctx.fillRect(x - 3, EDGE_Y - 8, p.width + 6, 4);
}
function draw() {
  const sky = ctx.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, '#cbdedb'); sky.addColorStop(.65, '#f7efcf'); sky.addColorStop(1, '#a6c5bb'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 400, 600);
  ctx.fillStyle = '#fff0c1'; ctx.beginPath(); ctx.arc(311, 98, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff9'; for (const [x, y, r] of [[53, 95, 22], [76, 83, 26], [98, 98, 22], [236, 170, 18], [257, 155, 24], [281, 170, 20]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#b7c8a5'; ctx.beginPath(); ctx.moveTo(0, 327); ctx.bezierCurveTo(120, 167, 181, 311, 240, 279); ctx.bezierCurveTo(333, 226, 367, 260, 400, 318); ctx.lineTo(400, 510); ctx.lineTo(0, 510); ctx.fill();
  ctx.fillStyle = '#96b59c'; ctx.beginPath(); ctx.moveTo(0, 351); ctx.bezierCurveTo(91, 265, 165, 415, 223, 314); ctx.bezierCurveTo(304, 255, 358, 294, 400, 351); ctx.lineTo(400, 600); ctx.lineTo(0, 600); ctx.fill();
  ctx.fillStyle = '#9cc5c6'; ctx.fillRect(0, 478, 400, 122); ctx.strokeStyle = '#e8f2e3aa'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) { const x = (i * 76 + (reducedMotion ? 0 : clock * 7)) % 420 - 20; ctx.beginPath(); ctx.moveTo(x, 494 + i * 13); ctx.lineTo(x + 37, 494 + i * 13); ctx.stroke(); }
  for (const [x, y] of [[19, 339], [366, 322], [344, 378]]) { ctx.fillStyle = '#799a7f'; ctx.beginPath(); ctx.ellipse(x, y, 22, 42, .25, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d9a394'; ctx.beginPath(); ctx.arc(x + 12, y - 6, 5, 0, Math.PI * 2); ctx.fill(); }
  platform(current); platform(target);
  ctx.fillStyle = '#f9d589'; ctx.fillRect(target.x + target.width / 2 - 5 - offset, EDGE_Y - 8, 10, 6);
  if (!['scrolling'].includes(phase)) fish(target.x + target.width / 2 - offset, EDGE_Y - 35);
  if (length > 0) {
    ctx.save(); ctx.translate(current.x + current.width - offset, EDGE_Y - 5); ctx.rotate(angle);
    ctx.fillStyle = '#ac805c'; ctx.beginPath(); ctx.roundRect(-3, -length, 6, length + 4, 3); ctx.fill();
    ctx.fillStyle = '#d7ba89'; ctx.fillRect(-2, -length + 2, 2, Math.max(0, length - 3)); ctx.restore();
  }
  cat(catX - offset, catY, phase === 'walking' && !reducedMotion ? Math.sin(clock * 19) * 2 : 0);
  ctx.fillStyle = '#47685c'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('오늘의 작은 산책  ·  ' + crossings + '번 건넘', 200, 42);
  if (phase === 'growing' || (phase === 'ready' && length > 0)) {
    ctx.fillStyle = '#fff9'; ctx.beginPath(); ctx.roundRect(128, 65, 144, 30, 15); ctx.fill(); ctx.fillStyle = '#82694c'; ctx.fillText(Math.floor(length) + ' px', 200, 85);
  }
}
reset(); let last = performance.now();
function frame(now) {
  const dt = Math.min(.035, (now - last) / 1000); last = now;
  if (shell.paused && phase === 'growing') cancelInput();
  if (!shell.paused && !shell.finished) {
    clock += dt;
    if (phase === 'growing') { length = Math.min(350, length + 190 * dt); $('[data-length]').textContent = Math.floor(length); if (length === 350) release(); }
    if (phase === 'lowering') {
      timer += dt; angle = Math.min(1, timer / .4) * Math.PI / 2;
      if (timer >= .4) { phase = 'walking'; timer = 0; walkStart = catX; }
    } else if (phase === 'walking') {
      timer += dt; const endX = current.x + current.width + length;
      catX = walkStart + (endX - walkStart) * Math.min(1, timer / .75);
      if (timer >= .75) {
        if (result.hit) {
          score += result.points; crossings++; streak = result.streak; shell.setScore(score); shell.save(score);
          note = result.perfect ? 'PERFECT! +' + result.points + '점 · ' + streak + ' 콤보' : '사뿐! +' + result.points + '점'; shell.tone(result.perfect ? 830 : 550, .16, 'triangle');
          phase = 'celebrating'; timer = 0; update();
        } else { phase = 'falling'; timer = 0; shell.tone(170, .2); note = length < target.gap ? '다리가 조금 짧았어요!' : '다리가 조금 길었어요!'; update(); }
      }
    } else if (phase === 'falling') {
      timer += dt; catY += 530 * timer * dt;
      if (timer > .7) { shell.finish(score, '다음엔 한 발 더!', `${crossings}번 건넘 · ${score.toLocaleString()}점\n다리 길이를 조금만 조절해 다시 도전해보세요.`); update(); }
    } else if (phase === 'celebrating') {
      timer += dt; if (timer > .45) { phase = 'scrolling'; timer = 0; }
    } else if (phase === 'scrolling') {
      timer += dt; offset = (target.x - 28) * Math.min(1, timer / .6);
      if (timer >= .6) {
        current = { x: 28, width: target.width }; target = platformFor(crossings, Math.random, current.width);
        offset = 0; catX = current.x + current.width / 2; catY = 409; length = 0; angle = 0; phase = 'ready'; update();
      }
    }
  }
  draw(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
