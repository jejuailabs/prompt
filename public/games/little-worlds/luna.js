import { $, GameShell, reducedMotion, pointerPosition } from './shared.js';
import { newGame, launch, step, nudge, W, H } from './luna-rules.mjs';
import { createRenderer } from './luna-art.js';

const canvas = $('canvas'), renderer = createRenderer(canvas, reducedMotion), shell = new GameShell('luna-pinball', reset);
const keys = new Set(), pointers = new Map();
let state, accumulator = 0, charge = 0, charging = false, lastPhase = '', shownScore = -1, noticeUntil = 0, audioTime = 0;
const controls = { left: false, right: false };
function clearInput() { keys.clear(); pointers.clear(); controls.left = false; controls.right = false; charging = false; charge = 0; }
function reset() {
  state = newGame(); clearInput(); accumulator = 0; shownScore = -1; lastPhase = ''; noticeUntil = 0; audioTime = 0;
  shell.setScore(0); notice('발사 버튼을 누르고 놓아, 정원을 깨워보세요.', 5); update();
}
function notice(value, seconds = 2.5) { $('[data-message]').textContent = value; noticeUntil = state.time + seconds; }
function update() {
  if (shownScore !== state.score) { shell.setScore(state.score); shell.save(state.score); shownScore = state.score; }
  $('[data-ball]').textContent = `${state.ballNo} / 3`;
  $('[data-multiplier]').textContent = '×' + state.multiplier;
  $('[data-combo]').textContent = state.time - state.lastHit < 1.4 && state.combo > 1 ? state.combo + ' COMBO' : 'FLOW & PRECISION';
  $('[data-orbits]').textContent = state.orbit + ' / 3';
  $('[data-lanes]').textContent = state.lanes.map((v, i) => v ? 'LUNA'[i] : '·').join(' ');
  $('[data-targets]').textContent = `${state.targets.filter(Boolean).length} / 6`;
  $('[data-tilt]').style.width = Math.min(100, state.tilt * 100) + '%';
  $('[data-tilt]').classList.toggle('danger', state.tilt > .72);
  $('[data-launch]').disabled = state.phase !== 'ready' || shell.finished;
  $('[data-launch]').textContent = charging ? '놓으면 발사' : '볼 발사';
  $('[data-nudge]').disabled = !['live', 'launch'].includes(state.phase) || shell.finished;
  $('[data-end]').disabled = state.score <= 0 || shell.finished;
  for (const side of ['left', 'right']) $('[data-pin="' + side + '"]').setAttribute('aria-pressed', String(controls[side]));
  canvas.setAttribute('aria-label', `루나 가든 핀볼 · ${state.score}점 · ${state.ballNo}번째 볼 · ${state.balls.length}개 공 · ${state.phase === 'ready' ? '발사 준비' : state.phase === 'over' ? '게임 종료' : '플레이 중'}`);
}
function startCharge() { if (state.phase !== 'ready' || shell.paused || shell.finished) return; charging = true; charge = 0; update(); }
function releaseCharge() {
  if (!charging) return; charging = false;
  if (!shell.paused && !shell.finished) { launch(state, Math.max(.3, charge)); notice('타이밍에 맞춰 플리퍼! ← → 또는 A · D', 3); shell.tone(240, .2, 'triangle'); }
  charge = 0; update();
}
function bump() {
  if (shell.paused || shell.finished) return;
  if (nudge(state, state.balls[0]?.x < 225 ? 1 : -1)) { notice('NUDGE · 연속으로 흔들면 TILT!', 2); shell.tone(130, .09, 'triangle'); }
  else if (state.time < state.tiltUntil) { notice('TILT! 3초 동안 플리퍼와 점수가 잠깐 멈춥니다.', 3); shell.tone(80, .3, 'sawtooth'); }
  update();
}
function finish() { clearInput(); state.phase = 'over'; shell.finish(state.score, 'A beautiful run.', `${state.score.toLocaleString()}점 · 최고 배수 ×${state.multiplier}\n달빛 정원에서, 다음 한 판은 더 멀리.`); update(); }
function setControls() {
  controls.left = keys.has('ArrowLeft') || keys.has('KeyA') || keys.has('ShiftLeft') || [...pointers.values()].includes('left');
  controls.right = keys.has('ArrowRight') || keys.has('KeyD') || keys.has('ShiftRight') || [...pointers.values()].includes('right');
}
function pointerDown(event, command) {
  if (event.button !== 0 || shell.paused || shell.finished) return;
  event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pointers.set(event.pointerId, command);
  if (command === 'launch') startCharge(); else { setControls(); shell.tone(125, .025, 'triangle'); update(); }
}
function pointerUp(event, canceled = false) {
  const command = pointers.get(event.pointerId); pointers.delete(event.pointerId);
  if (command === 'launch') { if (canceled) { charging = false; charge = 0; } else releaseCharge(); }
  setControls(); update();
}
for (const side of ['left', 'right']) {
  const button = $('[data-pin="' + side + '"]');
  button.addEventListener('pointerdown', event => pointerDown(event, side));
  button.addEventListener('click', event => {
    if (event.detail !== 0 || shell.paused || shell.finished) return;
    keys.add(side === 'left' ? 'ArrowLeft' : 'ArrowRight'); setControls();
    setTimeout(() => { keys.delete(side === 'left' ? 'ArrowLeft' : 'ArrowRight'); setControls(); }, 120);
  });
}
$('[data-launch]').addEventListener('pointerdown', event => pointerDown(event, 'launch'));
$('[data-launch]').addEventListener('click', event => { if (event.detail === 0 && !shell.paused && !shell.finished) { if (launch(state, .65)) shell.tone(240, .2, 'triangle'); update(); } });
canvas.addEventListener('pointerdown', event => {
  const pos = pointerPosition(event, canvas, W, H); canvas.focus();
  pointerDown(event, state.phase === 'ready' ? 'launch' : pos.x < 240 ? 'left' : 'right');
});
for (const element of [canvas, ...document.querySelectorAll('[data-pin],[data-launch]')]) {
  element.addEventListener('pointerup', event => pointerUp(event));
  element.addEventListener('pointercancel', event => pointerUp(event, true));
  element.addEventListener('lostpointercapture', event => { if (pointers.has(event.pointerId)) pointerUp(event, true); });
}
$('[data-nudge]').onclick = bump;
$('[data-end]').onclick = () => { if (state.score > 0 && !shell.finished && !shell.paused) finish(); };
document.addEventListener('keydown', event => {
  if (shell.paused || shell.finished || event.target.closest('a,input,textarea,select,.modal-layer')) return;
  const code = event.code;
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(code)) { event.preventDefault(); keys.add(code); setControls(); if (!event.repeat) shell.tone(125, .025, 'triangle'); }
  if (code === 'Space') { event.preventDefault(); if (!event.repeat) startCharge(); }
  if (code === 'ArrowUp' || code === 'KeyX') { event.preventDefault(); if (!event.repeat) bump(); }
});
document.addEventListener('keyup', event => { keys.delete(event.code); if (event.code === 'Space') { event.preventDefault(); releaseCharge(); } setControls(); });
window.addEventListener('blur', clearInput); document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });
reset(); let last = performance.now(), hud = 0;
function frame(now) {
  const dt = Math.min(.045, (now - last) / 1000); last = now;
  if (!shell.paused && !shell.finished) {
    if (charging) charge = Math.min(1, charge + dt / 1.1);
    accumulator += dt;
    while (accumulator >= 1 / 240) { step(state, 1 / 240, controls); accumulator -= 1 / 240; if (state.phase === 'over') break; }
    if (state.phase === 'over') finish();
    if (lastPhase !== state.phase) {
      if (state.phase === 'ready' && state.ballNo > 1) notice(`${state.ballNo}번째 볼 · 스페이스 또는 발사 버튼으로 다시 출발!`, 6);
      if (state.phase === 'rescue') notice('BALL SAVE · 공을 한 번 살렸어요!', 3);
      lastPhase = state.phase;
    }
    const recent = state.events.filter(e => e.time > audioTime);
    if (recent.length) {
      const event = recent.at(-1); audioTime = event.time;
      if (event.kind === 'score') { shell.tone(event.label.startsWith('+') ? 480 + state.combo * 90 : 940, .075, 'triangle'); if (!event.label.startsWith('+')) notice(event.label, 3); }
      if (event.kind === 'multiball') notice('JACKPOT! 세 개의 공으로 정원을 밝히세요.', 4);
    }
    if (state.time > noticeUntil) $('[data-message]').textContent = state.phase === 'ready' ? '스페이스 또는 발사 버튼을 누르고 놓으세요.' : 'LUNA 4개 = 배수 UP · ORBIT 3회 = 잭팟 + 멀티볼';
  } else { clearInput(); accumulator = 0; }
  hud += dt; if (hud >= .08) { update(); hud = 0; }
  $('[data-charge]').style.width = charge * 100 + '%';
  renderer.draw(state, controls, charge); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
