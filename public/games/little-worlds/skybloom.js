import { $, GameShell, reducedMotion, pointerPosition } from './shared.js';
import { newGame, launch, step, nudge, W, H, practiceGame, STAGES } from './skybloom-rules.mjs';
import { createRenderer } from './skybloom-art.js';

let practice = false;
class SkyShell extends GameShell {
  save(score) { if (!practice) super.save(score); }
  finish(score, title, description) {
    if (!practice) return super.finish(score, title, description);
    this.finished = true; this.dialog('Practice complete.', '상층 연습이 끝났어요. 연습 점수는 최고 기록과 랭킹에 남지 않습니다.', '정식 도전 시작', () => { practice = false; this.restart(); }, { label: '상층 다시 연습', action: () => this.restart() });
  }
}
const canvas = $('canvas'), renderer = createRenderer(canvas, reducedMotion), shell = new SkyShell('skybloom-pinball', reset);
const keys = new Set(), pointers = new Map();
let state, accumulator = 0, charge = 0, charging = false, lastPhase = '', shownScore = -1, noticeUntil = 0, audioTime = 0;
const controls = { left: false, right: false };
function clearInput() { keys.clear(); pointers.clear(); controls.left = false; controls.right = false; charging = false; charge = 0; }
function reset() {
  state = practice ? practiceGame() : newGame(); clearInput(); accumulator = 0; shownScore = -1; lastPhase = ''; noticeUntil = 0; audioTime = 0;
  shell.setScore(0); notice(practice ? '상층 연습 · ← →로 별 세 개를 모아보세요. 점수는 저장하지 않아요.' : '1,500점이면 정원에 새 장치가 생겨요. 발사해 보세요.', 5); update();
}
function notice(value, seconds = 2.5) { $('[data-message]').textContent = value; noticeUntil = state.time + seconds; }
function updateJourney() {
  const festival = state.festivalUntil > state.time;
  $('[data-stage]').textContent = practice ? '상층 연습 · 랭킹 제외' : festival ? '04 · 별빛 축제' : '0' + state.stage + ' · ' + STAGES[state.stage - 1];
  const goal = state.stage === 1 ? `새 범퍼·스피너까지 ${Math.max(0, 1500 - state.score).toLocaleString()}점` : state.stage === 2 ? `상층 개방까지 ${Math.max(0, 5000 - state.score).toLocaleString()}점` : festival ? `축제 ${Math.ceil(state.festivalUntil - state.time)}초 · 빛나는 범퍼 → 잭팟 ${state.jackpots % 6} / 6` : `상층 별 ${state.stars.filter(Boolean).length} / 3 → 축제 멀티볼`;
  $('[data-goal]').textContent = goal;
  const progress = state.stage === 1 ? state.score / 1500 : state.stage === 2 ? (state.score - 1500) / 3500 : festival ? (35 - (state.festivalUntil - state.time)) / 35 : state.stars.filter(Boolean).length / 3;
  $('[data-progress]').style.width = Math.max(0, Math.min(100, progress * 100)) + '%';
  $('[data-stars]').textContent = state.stars.map(v => v ? '★' : '☆').join(' ');
  document.querySelectorAll('[data-chapter]').forEach((el, i) => {
    el.classList.toggle('unlocked', i < state.stage || (i === 3 && state.festivals > 0));
    el.classList.toggle('current', i === (festival ? 3 : state.stage - 1));
  });
  $('[data-practice]').hidden = practice || state.score > 0 || !['ready', 'over'].includes(state.phase);
  $('[data-ranked]').hidden = !practice;
  $('[data-mode]').textContent = practice ? '연습 점수 · 저장하지 않음' : '한 판의 성장 · 최고 점수 경쟁';
}
function update() {
  if (shownScore !== state.score) { shell.setScore(state.score); shell.save(state.score); shownScore = state.score; }
  updateJourney();
  $('[data-ball]').textContent = `${state.ballNo} / 3`;
  $('[data-multiplier]').textContent = '×' + state.multiplier;
  $('[data-combo]').textContent = state.time - state.lastHit < 1.4 && state.combo > 1 ? state.combo + ' COMBO' : 'FLOW & PRECISION';
  $('[data-orbits]').textContent = state.orbit + ' / 3';
  $('[data-lanes]').textContent = state.lanes.map((v, i) => v ? 'GROW'[i] : '·').join(' ');
  $('[data-targets]').textContent = `${state.targets.filter(Boolean).length} / 6`;
  $('[data-tilt]').style.width = Math.min(100, state.tilt * 100) + '%';
  $('[data-tilt]').classList.toggle('danger', state.tilt > .72);
  $('[data-launch]').disabled = state.phase !== 'ready' || shell.finished;
  $('[data-launch]').textContent = charging ? '놓으면 발사' : '볼 발사';
  $('[data-nudge]').disabled = !['live', 'launch'].includes(state.phase) || shell.finished;
  $('[data-end]').disabled = (!practice && state.score <= 0) || shell.finished;
  for (const side of ['left', 'right']) $('[data-pin="' + side + '"]').setAttribute('aria-pressed', String(controls[side]));
  canvas.setAttribute('aria-label', `스카이블룸 핀볼 · ${state.score}점 · ${state.ballNo}번째 볼 · ${state.balls.length}개 공 · ${state.phase === 'ready' ? '발사 준비' : state.phase === 'over' ? '게임 종료' : '플레이 중'}`);
}
function startCharge() { if (state.phase !== 'ready' || shell.paused || shell.finished) return; charging = true; charge = 0; update(); }
function releaseCharge() {
  if (!charging) return; charging = false;
  if (!shell.paused && !shell.finished) { launch(state, Math.max(.3, charge)); notice('테이블 왼쪽·오른쪽 터치 / ← → 플리퍼', 3); shell.tone(240, .2, 'triangle'); }
  charge = 0; update();
}
function bump() {
  if (shell.paused || shell.finished) return;
  if (nudge(state, state.balls[0]?.x < 225 ? 1 : -1)) { notice('NUDGE · 연속으로 흔들면 TILT!', 2); shell.tone(130, .09, 'triangle'); }
  else if (state.time < state.tiltUntil) { notice('TILT! 3초 동안 플리퍼와 점수가 잠깐 멈춥니다.', 3); shell.tone(80, .3, 'sawtooth'); }
  update();
}
function finish() { clearInput(); state.phase = 'over'; shell.finish(state.score, 'Your garden grew.', `${state.score.toLocaleString()}점 · 최고 배수 ×${state.multiplier}\n${STAGES[state.stage - 1]} 도달 · 별빛 축제 ${state.festivals}회`); update(); }
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
$('[data-end]').onclick = () => { if ((practice || state.score > 0) && !shell.finished && !shell.paused) finish(); };
document.addEventListener('keydown', event => {
  if (shell.paused || shell.finished || event.target.closest('a,input,textarea,select,.modal-layer')) return;
  const code = event.code;
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(code)) { event.preventDefault(); keys.add(code); setControls(); if (!event.repeat) shell.tone(125, .025, 'triangle'); }
  if (code === 'Space') { event.preventDefault(); if (!event.repeat) startCharge(); }
  if (code === 'ArrowUp' || code === 'KeyX') { event.preventDefault(); if (!event.repeat) bump(); }
});
document.addEventListener('keyup', event => { keys.delete(event.code); if (event.code === 'Space') { event.preventDefault(); releaseCharge(); } setControls(); });
window.addEventListener('blur', clearInput); document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });
document.querySelector('[data-practice]').onclick = () => { practice = true; shell.restart(); };
document.querySelector('[data-ranked]').onclick = () => { practice = false; shell.restart(); };
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
      const event = recent.find(e => ['upgrade', 'multiball'].includes(e.kind)) || recent.at(-1); audioTime = recent.at(-1).time;
      if (event.kind === 'score') { shell.tone(event.label.startsWith('+') ? 480 + state.combo * 90 : 940, .075, 'triangle'); if (!event.label.startsWith('+')) notice(event.label, 3); }
      if (['upgrade', 'multiball', 'notice'].includes(event.kind)) { notice(event.label, 5); shell.tone(880, .3, 'triangle'); }
    }
    if (state.time > noticeUntil) $('[data-message]').textContent = state.phase === 'ready' ? '스페이스 또는 발사 버튼을 누르고 놓으세요.' : '빛나는 레인과 범퍼를 공략해 다음 정원을 열어보세요.';
  } else { clearInput(); accumulator = 0; }
  hud += dt; if (hud >= .08) { update(); hud = 0; }
  $('[data-charge]').style.width = charge * 100 + '%';
  renderer.draw(state, controls, charge); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
