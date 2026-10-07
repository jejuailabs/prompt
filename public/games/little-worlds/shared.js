export const ASSETS = '/games/little-worlds/assets/';
export const $ = (selector) => document.querySelector(selector);
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embedded');

export function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`little-worlds:${key}`)) ?? fallback; } catch { return fallback; }
}
export function writeStore(key, value) {
  try { localStorage.setItem(`little-worlds:${key}`, JSON.stringify(value)); } catch { /* Private browsing can disable storage. */ }
}
export function atlasStyle(name, index, columns = 3, rows = 3) {
  return `background-image:url('${ASSETS}${name}.webp');background-size:${columns * 100}% ${rows * 100}%;background-position:${(index % columns) / (columns - 1) * 100}% ${Math.floor(index / columns) / (rows - 1) * 100}%;`;
}
export function atlasIcon(name, index, columns = 3, rows = 3, size = 45) {
  return `<span class="atlas-icon" aria-hidden="true" style="width:${size}px;height:${size}px;${atlasStyle(name, index, columns, rows)}"></span>`;
}
export async function loadAssets(names) {
  const status = $('.asset-status');
  try {
    const entries = await Promise.all(names.map(async name => {
      const img = new Image(); img.src = `${ASSETS}${name}.webp`;
      await img.decode(); return [name, img];
    }));
    if (status) status.hidden = true;
    return Object.fromEntries(entries);
  } catch (error) {
    if (status) {
      status.innerHTML = '<span>그림을 불러오지 못했어요.<br>연결을 확인하고 다시 시도해 주세요.</span><button type="button">다시 불러오기</button>';
      status.querySelector('button').onclick = () => location.reload();
    }
    throw error;
  }
}
export function drawSprite(ctx, atlas, index, x, y, size, columns = 3, rows = 3, angle = 0) {
  const sw = atlas.width / columns, sh = atlas.height / rows;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.drawImage(atlas, index % columns * sw, Math.floor(index / columns) * sh, sw, sh, -size / 2, -size / 2, size, size);
  ctx.restore();
}
export function canvasSetup(canvas, width = 400, height = 600) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  return ctx;
}
export function pointerPosition(event, element, width = 400, height = 600) {
  const rect = element.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * width, y: (event.clientY - rect.top) / rect.height * height };
}
export function toast(message) {
  const el = $('.toast'); if (!el) return;
  el.textContent = message; el.classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('visible'), 2200);
}

export class GameShell {
  constructor(id, onRestart) {
    this.roundId=crypto.randomUUID();this.roundStarted=performance.now();this.previewMode=new URLSearchParams(location.search).get('preview')==='1';
    this.id = id; this.onRestart = onRestart; this.paused = false; this.finished = false;
    this.best = Number(readStore(`${id}:best`, 0)) || 0;
    this.muted = readStore('muted', false); this.audio = null;
    this.updateBest();
    $('[data-pause]').onclick = () => this.togglePause();
    $('[data-mute]').onclick = () => { this.muted = !this.muted; writeStore('muted', this.muted); this.updateMute(); if (!this.muted) this.tone(600); };
    this.updateMute();
    if(window.parent===window)this.createRanking();
    window.addEventListener('message',event=>{if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='game-score-saved')return;const pending=readStore(this.id+':pending-score',null);if(pending?.roundId===event.data.roundId){writeStore(this.id+':pending-score',null);this.rankStatus?.('기록을 저장했습니다.');}});
    document.addEventListener('visibilitychange', () => { if (document.hidden && !this.finished) this.togglePause(true); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.togglePause(); });
  }
  createRanking(){
    const journal=$('.journal');if(!journal)return;
    const section=document.createElement('section');section.className='journal-section game-ranking';section.innerHTML='<h2>최고 기록 랭킹</h2><p class="ranking-status" role="status"></p><div data-rankings></div><a class="rank-action" href="/app#game-play?id=builtin-'+this.id+'">로그인 · 내 기록 등록 ↗</a>';
    journal.append(section);this.rankStatus=message=>{section.querySelector('.ranking-status').textContent=message;};this.rankings=section.querySelector('[data-rankings]');
    if(this.previewMode){this.rankStatus('미리보기 · 최고 점수는 이 기기에 저장됩니다.');return;}void this.refreshRanking();
  }
  async refreshRanking(){
    if(!this.rankings)return;
    try{const response=await fetch('/api/game-room/leaderboard?gameId=builtin-'+this.id+'&period=all&limit=5',{cache:'no-store'});const result=await response.json();if(!response.ok||!result.ok)throw new Error('ranking');
      this.rankings.replaceChildren(...result.data.rankings.map(row=>{const el=document.createElement('div');el.className='ranking-row';const rank=document.createElement('b'),name=document.createElement('span'),score=document.createElement('strong');rank.textContent=row.rank;name.textContent=row.username;score.textContent=row.score.toLocaleString()+'점';el.append(rank,name,score);return el;}));this.rankStatus(result.data.rankings.length?'한 사람의 최고 점수만 표시합니다.':'아직 기록이 없어요. 첫 기록에 도전해보세요.');
    }catch{this.rankStatus('랭킹을 불러오지 못했어요. 잠시 후 다시 플레이해주세요.');}
  }
  async submitRound(round){
    if(this.previewMode||round.score<=0)return;
    try{const response=await fetch('/api/game-room/play',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({artifactId:'builtin-'+this.id,...round})});const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'기록 저장에 실패했어요.');writeStore(this.id+':pending-score',null);await this.refreshRanking();this.rankStatus?.(round.score.toLocaleString()+'점 기록을 저장했습니다.');}
    catch(error){this.rankStatus?.(error.message+' 이번 점수는 보관 중입니다.');}
  }
  updateBest() { const el = $('[data-best]'); if (el) el.textContent = this.best.toLocaleString(); }
  updateMute() { const el = $('[data-mute]'); el.textContent = this.muted ? '♪̸' : '♪'; el.setAttribute('aria-label', this.muted ? '소리 켜기' : '소리 끄기'); el.setAttribute('aria-pressed', String(this.muted)); }
  tone(frequency = 500, duration = .12, type = 'sine') {
    if (this.muted) return;
    try {
      this.audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.audio.state === 'suspended') void this.audio.resume();
      const osc = this.audio.createOscillator(), gain = this.audio.createGain();
      osc.type = type; osc.frequency.setValueAtTime(frequency, this.audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.35, this.audio.currentTime + duration);
      gain.gain.setValueAtTime(.055, this.audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.audio.currentTime + duration);
      osc.connect(gain); gain.connect(this.audio.destination); osc.start(); osc.stop(this.audio.currentTime + duration);
    } catch { /* Audio is optional. */ }
  }
  setScore(score) { $('[data-score]').textContent = Math.floor(score).toLocaleString(); }
  save(score) { if (score > this.best) { this.best = Math.floor(score); writeStore(`${this.id}:best`, this.best); this.updateBest(); } }
  dialog(title, description, action, callback, secondary) {
    const layer = $('.modal-layer'); layer.hidden = false;
    layer.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><span class="eyebrow">LITTLE WORLDS</span><h2 id="dialog-title"></h2><p></p><button class="primary-button" type="button"></button></div>';
    layer.querySelector('h2').textContent = title; layer.querySelector('p').textContent = description;
    const button = layer.querySelector('button'); button.textContent = action; button.onclick = callback;
    if (secondary) { const other = document.createElement('button'); other.type = 'button'; other.className = 'secondary-button'; other.textContent = secondary.label; other.onclick = secondary.action; layer.firstChild.append(other); }
    this.previousFocus = document.activeElement; button.focus();
    layer.onkeydown = e => { if (e.key === 'Tab') { const buttons = [...layer.querySelectorAll('button')]; if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0].focus(); } } };
  }
  closeDialog() { $('.modal-layer').hidden = true; this.previousFocus?.focus(); }
  togglePause(force) {
    if (this.finished) return;
    if (!this.paused && !$('.modal-layer').hidden) return;
    this.paused = typeof force === 'boolean' ? force : !this.paused;
    if (this.paused) this.dialog('A little pause.', '잠깐 쉬어가도 괜찮아요.\n이어서 작은 세계를 즐겨보세요.', '계속 플레이', () => this.togglePause(false), { label: '처음부터 다시', action: () => this.restart() });
    else this.closeDialog();
  }
  restart() { this.roundId=crypto.randomUUID();this.roundStarted=performance.now();this.finished = false; this.paused = false; this.closeDialog(); this.onRestart(); }
  finish(score, title, description) {
    if (this.finished) return;
    this.finished = true; this.save(score);
    const round={score:Math.floor(score),roundId:this.roundId,durationMs:Math.min(86400000,Math.floor(performance.now()-this.roundStarted))};
    if(round.score>0&&!this.previewMode){writeStore(this.id+':pending-score',round);if(window.parent!==window)window.parent.postMessage({type:'game-score',...round},location.origin);else void this.submitRound(round);}
    this.dialog(title, description, '한 번 더 플레이', () => this.restart(), { label: '다른 게임 둘러보기', action: () => { location.href = '/games/little-worlds.html'; } });
  }
}
