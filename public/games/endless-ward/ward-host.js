/* Portable host contract v1; no network, SDK, login or API endpoint. */
(() => {
  'use strict';
  const gameId = 'endless-ward', contractVersion = 1;
  const query = new URLSearchParams(location.search);
  const preview = query.get('preview') === '1' || query.get('qa') === '1';
  const pendingKey = `portable-game:1:${gameId}:pending-score`;
  let origin = null;
  try { const url = new URL(query.get('parentOrigin') || location.origin); if (/^https?:$/.test(url.protocol) && url.origin === url.href.replace(/\/$/, '')) origin = url.origin; } catch {}
  const embedded = parent !== window;
  let queue = [], state = {mode:'loading', muted:false}, roundId = '', finished = false, disposed = false;
  let stickPointer = null, stickCenter = null, ui = null;
  const allowed = new Set(['start','pause','resume','restart','resize','dispose']);
  function send(type, detail = {}) {
    if (preview && type === 'game-score') return;
    if (embedded && origin && !disposed) parent.postMessage({type, gameId, contractVersion, ...detail}, origin);
  }
  function readPending() { try { return JSON.parse(localStorage.getItem(pendingKey)); } catch { return null; } }
  function replayPending() { const p=readPending(); if(p && p.gameId===gameId && p.contractVersion===1 && Number.isSafeInteger(p.score) && p.score>0 && p.score<=100000000 && typeof p.roundId==='string') send('game-score',p); }
  function move(x=0,y=0) { queue=queue.filter(item=>item.command!=='move'); queue.push({command:'move',x,y}); }
  function releaseStick() { stickPointer=null; stickCenter=null; move(); if(ui)ui.querySelector('.knob').style.transform='translate(0,0)'; }
  function command(value) {
    if(disposed)return;
    if(value==='resize'){ window.dispatchEvent(new Event('resize')); return; }
    if(value==='pause'||value==='restart'||value==='dispose')releaseStick();
    queue.push({command:value});
  }
  function onMessage(event) {
    if (!embedded || event.source !== parent || event.origin !== origin || !event.data) return;
    const data=event.data;
    if(data.gameId!==gameId || data.contractVersion!==contractVersion)return;
    if(data.type==='game-command' && allowed.has(data.command))command(data.command);
    if(data.type==='game-score-saved' && typeof data.roundId==='string'){
      const p=readPending(); if(p?.roundId===data.roundId){try{localStorage.removeItem(pendingKey);}catch{}}
    }
  }
  function onVisibility(){if(document.hidden){releaseStick();queue.push({command:'pause',reason:'focus'});}}
  function onBlur(){releaseStick();queue.push({command:'pause',reason:'focus'});}
  function paint(){
    if(!ui)return;
    ui.dataset.mode=state.mode;
    ui.querySelector('[data-action="mute"]').textContent=state.muted?'소리 켜기':'소리 끄기';
    ui.querySelector('[data-action="pause"]').textContent=state.mode==='paused'?'계속':'일시정지';
    const play=ui.querySelector('[data-action="play"]');
    play.hidden=!['ready','paused','won','lost'].includes(state.mode);
    play.textContent=state.mode==='paused'?'계속하기':state.mode==='ready'?'생존 시작':'다시 도전';
    ui.querySelector('.result').textContent=['won','lost'].includes(state.mode)?`이번 기록 ${Number(state.score).toLocaleString()}점 · 병동 ${state.clearedStages}/3`:'';
  }
  function mount(){
    const style=document.createElement('style');
    style.textContent=`html,body{overscroll-behavior:none}#ward-controls{position:fixed;inset:0;pointer-events:none;z-index:20;font:14px system-ui,sans-serif;color:#e5eee7}#ward-controls button{pointer-events:auto;min-height:44px;border:1px solid #73ab9955;border-radius:10px;background:#102c2de8;color:inherit;padding:9px 14px;font:inherit;touch-action:manipulation;cursor:pointer}#ward-controls button:focus-visible{outline:3px solid #b9f0d6}#ward-controls .actions{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));display:flex;gap:6px}#ward-controls .center{position:absolute;top:85%;left:50%;transform:translate(-50%,-50%);text-align:center;white-space:nowrap}#ward-controls [data-action=play]{font-weight:700;background:#9cddc5;color:#153a32;min-width:160px}#ward-controls .result{margin-top:8px;text-shadow:0 1px 3px #000}#ward-controls .stick{display:none;pointer-events:auto;touch-action:none;position:absolute;left:max(22px,env(safe-area-inset-left));bottom:max(110px,env(safe-area-inset-bottom));width:112px;height:112px;border:2px solid #9cddc570;border-radius:50%;background:#12333166}#ward-controls .knob{position:absolute;left:36px;top:36px;width:40px;height:40px;border-radius:50%;background:#9cddc5aa;box-shadow:0 0 20px #0008}#ward-controls .rotate{display:none;position:absolute;bottom:6px;left:50%;transform:translateX(-50%);font-size:12px;color:#b9d9ce}#ward-controls[data-mode=loading]{display:none}#ward-controls[data-mode=ready] .stick,#ward-controls[data-mode=won] .stick,#ward-controls[data-mode=lost] .stick{visibility:hidden}@media(pointer:coarse){#ward-controls .stick{display:block}}#ward-controls.touch .stick{display:block}@media(max-width:600px) and (orientation:portrait){#ward-controls .rotate{display:block}#ward-controls .actions{bottom:4px;right:4px;gap:3px}#ward-controls button{padding:6px 9px;font-size:12px}}`;
    style.textContent += '@media(max-width:600px){#ward-controls .actions button{width:44px;padding:0;font-size:0}#ward-controls .actions button:after{font-size:20px}#ward-controls [data-action=pause]:after{content:"Ⅱ"}#ward-controls[data-mode=paused] [data-action=pause]:after{content:"▶"}#ward-controls [data-action=mute]:after{content:"♪"}#ward-controls [data-action=touch]:after{content:"✥"}#ward-controls [data-action=fullscreen]:after{content:"⛶"}}';
    document.head.append(style);
    ui=document.createElement('div');ui.id='ward-controls';
    ui.innerHTML='<div class="actions"><button data-action="pause">일시정지</button><button data-action="mute">소리 끄기</button><button data-action="touch" aria-label="터치 이동 패드 표시">이동 패드</button><button data-action="fullscreen">전체화면</button></div><div class="center"><button data-action="play">생존 시작</button><div class="result" aria-live="polite"></div></div><div class="stick" role="application" aria-label="드래그해서 이동"><span class="knob"></span></div><span class="rotate">가로 화면으로 돌리면 더 넓게 볼 수 있어요</span>';
    document.body.append(ui);
    ui.addEventListener('click',e=>{
      const action=e.target.closest('button')?.dataset.action;if(!action)return;
      if(action==='touch')ui.classList.toggle('touch');
      else if(action==='fullscreen'){
        const promise=document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.();promise?.catch(()=>{});
      }else if(action==='pause')command(state.mode==='paused'?'resume':'pause');
      else if(action==='play')command(state.mode==='paused'?'resume':state.mode==='ready'?'start':'restart');
      else command('mute');
      if(action!=='touch')document.getElementById('canvas')?.focus();
    });
    const stick=ui.querySelector('.stick');
    function point(e){
      const dx=e.clientX-stickCenter.x,dy=e.clientY-stickCenter.y,length=Math.hypot(dx,dy),scale=Math.min(1,42/Math.max(1,length));
      ui.querySelector('.knob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
      if(length<7)move();else move(dx/Math.max(42,length),dy/Math.max(42,length));
    }
    stick.addEventListener('pointerdown',e=>{if(stickPointer!==null||state.mode!=='playing')return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);const rect=stick.getBoundingClientRect();stickCenter={x:rect.left+56,y:rect.top+56};point(e);document.getElementById('canvas')?.focus();});
    stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();point(e);}});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId===stickPointer)releaseStick();});
    paint();
  }
  window.wardHost={
    ready(){send('game-ready');replayPending();},
    drain(){const result=JSON.stringify(queue);queue=[];return result;},
    update(next){
      const old=state.mode;state={...next};
      if(old!==state.mode){
        if(state.mode==='paused'){releaseStick();send('game-paused',{reason:state.pauseReason});}
        else if(old==='paused')send('game-resumed');
      }
      paint();
    },
    event(type){
      if(type==='game-start'){roundId=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;finished=false;send(type,{roundId});}
      if(type==='game-finished'&&!finished){
        finished=true;const result={gameId,contractVersion,roundId,score:state.score,durationMs:Math.min(86400000,state.durationMs)};
        if(!preview&&result.score>0){try{localStorage.setItem(pendingKey,JSON.stringify(result));}catch{}send('game-score',result);}
        send(type,{...result,won:state.mode==='won',clearedStages:state.clearedStages});
      }
    },
    dispose(){if(disposed)return;releaseStick();disposed=true;queue=[];window.removeEventListener('message',onMessage);window.removeEventListener('blur',onBlur);document.removeEventListener('visibilitychange',onVisibility);ui?.remove();},
  };
  window.gameModule={...Object.fromEntries([...allowed].map(name=>[name,()=>command(name)])),snapshot:()=>({...state,roundId})};
  window.addEventListener('message',onMessage);window.addEventListener('blur',onBlur);document.addEventListener('visibilitychange',onVisibility);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
