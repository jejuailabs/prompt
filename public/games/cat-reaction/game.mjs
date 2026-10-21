// 번개 냥이 반응속도 — a portable three-stage reaction game. No host, server or CDN is required to play.
import {STAGES,TOTAL_TRIALS,RANKING_KEY,MISS_MS,PENALTY_MS,planTrial,classifyTap,recordedMs,average,summarize,encodeScore,verifyProof,grade,moodFor,random} from './rules.mjs';

const ID='cat-reaction',VERSION='1.0.0',CONTRACT_VERSION=1;
const params=new URLSearchParams(location.search),qa=params.get('qa')==='1',preview=params.get('preview')==='1'||qa;
const rand=random(Number(params.get('seed'))||Date.now()^Math.floor(Math.random()*1e9));
const key=part=>`portable-game:1:${ID}:${part}`;
const read=(part,fallback)=>{try{return JSON.parse(localStorage.getItem(key(part)))??fallback;}catch{return fallback;}};
const write=(part,value)=>{try{if(value===null)localStorage.removeItem(key(part));else localStorage.setItem(key(part),JSON.stringify(value));}catch{}};
let parentOrigin=null;
if(window.parent!==window){try{const configured=params.get('parentOrigin'),ref=document.referrer?new URL(document.referrer).origin:null;parentOrigin=configured?new URL(configured).origin:ref===location.origin?ref:null;}catch{}}
const emit=(type,extra={})=>{if(preview||!parentOrigin)return;window.parent.postMessage({type,gameId:ID,contractVersion:CONTRACT_VERSION,...extra},parentOrigin);};

const FISH='<svg viewBox="0 0 64 36" aria-hidden="true"><path d="M8 18c8-11 26-14 38-4l10-8-3 12 3 12-10-8C34 32 16 29 8 18z" fill="#ffb347"/><circle cx="20" cy="15" r="3" fill="#3b2f45"/><path d="M30 10c4 4 4 12 0 16" stroke="#ff8a3d" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>';
const BOLT='<svg viewBox="0 0 48 64" aria-hidden="true"><path d="M29 2 6 37h15l-5 25 26-38H27z" fill="#fff36b" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';
document.body.innerHTML=`<main class="app" data-phase="boot" aria-label="번개 냥이 반응속도">
<header class="top"><div class="brand"><span class="eyebrow">COAI 게임룸 · 냥이 클럽</span><h1>번개 냥이 반응속도</h1></div>
<div class="tools"><div class="best" title="이 기기의 최고 기록"><small>내 최고</small><b data-best>—</b></div><button class="tool" data-mute aria-label="소리 끄기">♪</button><button class="tool" data-pause aria-label="일시정지">Ⅱ</button></div></header>
<ol class="stages" aria-label="단계">${STAGES.map(s=>`<li data-stage="${s.id}"><b>${s.id}</b><span><strong>${s.name}</strong><em>${s.tag}</em></span><i data-stage-avg>—</i></li>`).join('')}</ol>
<section class="card" data-card tabindex="0" aria-describedby="signal-sub">
 <div class="glow" aria-hidden="true"></div>
 <div class="fx" aria-hidden="true"><span class="zzz"><i>z</i><i>z</i><i>Z</i></span><span class="bolt">${BOLT}</span><span class="fish">${FISH}</span><span class="sweat"></span><span class="stars"><i>✦</i><i>✧</i><i>✦</i><i>✧</i></span></div>
 <div class="signal" aria-live="assertive"><strong data-big></strong><span id="signal-sub" data-sub></span></div>
 <div class="sheet" data-sheet hidden></div>
 <div class="boot" data-boot>냥이를 깨우는 중…</div>
</section>
<div class="track" data-track aria-hidden="true">${STAGES.map(s=>`<span class="group">${Array.from({length:s.trials},()=>'<i></i>').join('')}</span>`).join('')}</div>
<div class="chips" data-chips aria-label="이번 단계 기록"></div>
<div class="toast" role="status"></div>
</main>`;
const $=s=>document.querySelector(s);
const app=$('.app'),card=$('[data-card]'),big=$('[data-big]'),sub=$('[data-sub]'),sheet=$('[data-sheet]'),chips=$('[data-chips]'),trackBars=[...document.querySelectorAll('[data-track] i')],stageItems=[...document.querySelectorAll('[data-stage]')];
const bestEl=$('[data-best]'),muteBtn=$('[data-mute]'),pauseBtn=$('[data-pause]'),toastEl=$('.toast');
const abort=new AbortController(),on=(t,type,fn,o={})=>t.addEventListener(type,fn,{...o,signal:abort.signal});

let stage3d=null,best=read('best',0),muted=read('muted',false),audio=null,disposed=false,raf=0,last=0;
const S={phase:'intro',stage:0,trialInStage:0,trials:[],falseStarts:0,stageFalse:[0,0,0],plan:null,shownAt:0,roundId:'',activeMs:0,activeSince:0,paused:false,resumePhase:'',decoy:'',lastMs:0,result:null,submitted:null};
let timers=[];const later=(ms,fn)=>{const id=setTimeout(()=>{timers=timers.filter(t=>t!==id);fn();},ms);timers.push(id);return id;};
const clearTimers=()=>{timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(S.signalFrame);};

// ── sound (synthesised, no files) ──
function unlock(){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function tone(freq,dur=.1,type='sine',vol=.05,slide=0,delay=0){if(muted)return;unlock();if(!audio)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+dur);o.onended=()=>{o.disconnect();g.disconnect();};}
const sfx={go:()=>{tone(880,.09,'triangle',.06);tone(1320,.12,'triangle',.05,0,.05);},hit:ms=>{const f=ms<250?1046:ms<330?880:740;tone(f,.08,'sine',.05);tone(f*1.5,.14,'sine',.04,0,.07);},early:()=>tone(220,.25,'square',.035,-90),decoy:()=>tone(520,.06,'sine',.025),miss:()=>tone(330,.3,'triangle',.04,-120),ready:()=>tone(600,.05,'sine',.025),party:()=>[523,659,784,1046].forEach((f,i)=>tone(f,.16,'triangle',.045,0,i*.09))};

function updateBest(){bestEl.textContent=best?best+' ms':'—';}
function updateMute(){muteBtn.textContent=muted?'♪̸':'♪';muteBtn.setAttribute('aria-pressed',String(muted));muteBtn.setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');}
function toast(text){toastEl.textContent=text;toastEl.classList.add('visible');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('visible'),1600);}
const activeNow=()=>S.activeMs+(S.activeSince?performance.now()-S.activeSince:0);

function updateFraming(){if(!stage3d)return;const h=card.clientHeight||1,sig=document.querySelector('.signal'),top=big.textContent?(sig.offsetTop+sig.offsetHeight+6)/h:.04,bottom=sheet.hidden?.98:(sheet.offsetTop-8)/h;stage3d.setFraming(top,bottom);}
function setPhase(phase,bigText='',subText=''){S.phase=phase;app.dataset.phase=phase;big.textContent=bigText;sub.textContent=subText;updateFraming();
 const pose={intro:'idle','stage-intro':'idle',ready:'ready',wait:'sleep',decoy:'decoy',go:'go',early:'early',hit:'hit',miss:'miss',result:'party'}[phase];if(pose&&stage3d)stage3d.setPose(pose);
 card.setAttribute('aria-label',{wait:'기다리세요. 초록색이 되면 누르세요',decoy:'속임수 신호입니다. 누르지 마세요',go:'지금 누르세요!'}[phase]||'반응 카드');}
function renderProgress(){
 let at=0;STAGES.forEach((s,si)=>{for(let i=0;i<s.trials;i++,at++){const bar=trackBars[at],v=S.trials[at];bar.className=v!==undefined?(v>=MISS_MS?'miss':'done'):at===S.trials.length&&S.phase!=='intro'&&S.phase!=='result'?'now':'';}});
 stageItems.forEach((li,i)=>{const s=STAGES[i],start=STAGES.slice(0,i).reduce((n,x)=>n+x.trials,0),part=S.trials.slice(start,start+s.trials);li.dataset.status=i<S.stage||S.phase==='result'?'done':i===S.stage&&S.phase!=='intro'?'now':'';li.querySelector('[data-stage-avg]').textContent=part.length===s.trials?average(part)+' ms':part.length?part.length+'/'+s.trials:'—';});
 const s=STAGES[S.stage],start=STAGES.slice(0,S.stage).reduce((n,x)=>n+x.trials,0),part=S.trials.slice(start,start+s.trials);
 chips.innerHTML=S.phase==='intro'||S.phase==='result'?'':`<span class="label">${s.id}단계</span>`+Array.from({length:s.trials},(_,i)=>{const v=part[i];return `<span class="chip ${v===undefined?'':v>=MISS_MS?'miss':'done'}">${v===undefined?(i+1)+'번':v>=MISS_MS?'놓침':v+'ms'}</span>`;}).join('')+(S.stageFalse[S.stage]?`<span class="chip early">실수 ${S.stageFalse[S.stage]}</span>`:'');
}

function showSheet(html){sheet.innerHTML=html;sheet.hidden=false;updateFraming();const primary=sheet.querySelector('[data-go]');primary?.addEventListener('click',e=>{e.stopPropagation();unlock();primaryAction();},{signal:abort.signal});sheet.querySelector('[data-again]')?.addEventListener('click',e=>{e.stopPropagation();startRound();},{signal:abort.signal});requestAnimationFrame(()=>primary?.focus({preventScroll:true}));}
function hideSheet(){sheet.hidden=true;sheet.innerHTML='';updateFraming();}

function intro(){
 clearTimers();S.stage=0;S.trials=[];S.result=null;stage3d?.setBreed(STAGES[0].breed,STAGES[0].coat);setPhase('intro');
 showSheet(`<p class="kicker">3단계 반응속도 챌린지</p><h2>냥이가 깨어나는 순간, 톡!</h2>
 <ol class="plan">${STAGES.map(s=>`<li><b>${s.id}</b><div><strong>${s.name}</strong><span>${s.hint}</span></div></li>`).join('')}</ol>
 <p class="note">세 단계 평균을 다시 평균 낸 값이 <b>종합 기록</b>이에요. 초록 전에 누르면 실수 1회마다 +${PENALTY_MS}ms.</p>
 <button class="primary" data-go>시작하기</button>`);renderProgress();
}
function startRound(){
 if(disposed)return;unlock();clearTimers();
 Object.assign(S,{stage:0,trialInStage:0,trials:[],falseStarts:0,stageFalse:[0,0,0],plan:null,roundId:makeRoundId(),activeMs:0,activeSince:performance.now(),paused:false,result:null,submitted:null});
 emit('game-start',{roundId:S.roundId});stageIntro();
}
function stageIntro(){
 const s=STAGES[S.stage];stage3d?.setBreed(s.breed,s.coat);setPhase('stage-intro');
 const prev=S.stage>0?STAGES[S.stage-1]:null,start=prev?STAGES.slice(0,S.stage-1).reduce((n,x)=>n+x.trials,0):0,prevAvg=prev?average(S.trials.slice(start,start+prev.trials)):0;
 showSheet(`${prev?`<p class="cleared">${prev.id}단계 평균 <b>${prevAvg} ms</b></p>`:''}<p class="kicker">${s.id}단계 · ${s.tag}</p><h2>${s.name}</h2><p class="hint">${s.hint}</p>
 ${s.id===2?'<div class="legend"><span class="sw go">초록+⚡ 진짜</span><span class="sw yellow">노랑</span><span class="sw sky">하늘</span><span class="sw teal">청록</span><span class="sw fish">물고기</span></div>':''}
 ${s.id===3?'<div class="legend"><span class="sw go">5번 연속</span><span class="sw quick">대기 0.5~2초</span></div>':''}
 <button class="primary" data-go>${s.id}단계 시작</button>`);renderProgress();
}
function primaryAction(){if(S.phase==='intro'||S.phase==='result')startRound();else if(S.phase==='stage-intro'){hideSheet();S.trialInStage=0;ready();}}

function ready(){clearTimers();setPhase('ready','준비…',STAGES[S.stage].hint);sfx.ready();renderProgress();later(STAGES[S.stage].chain&&S.trialInStage>0?250:850,wait);}
function wait(){
 const s=STAGES[S.stage];S.plan=planTrial(s,rand);setPhase('wait','쉿… 기다려요','초록색으로 바뀌면 바로 터치!');
 for(const d of S.plan.decoys)later(d.at,()=>decoy(d.kind));
 later(S.plan.wait,signal);
}
function decoy(kind){
 if(S.phase!=='wait')return;S.decoy=kind;app.dataset.decoy=kind;setPhase('decoy',kind==='fish'?'냥?':'지금?',kind==='fish'?'물고기는 속임수예요!':'진짜 신호는 초록 + 번개!');sfx.decoy();
 later(kind==='fish'?650:420,()=>{if(S.phase!=='decoy')return;delete app.dataset.decoy;setPhase('wait','쉿… 기다려요','초록색으로 바뀌면 바로 터치!');});
}
function signal(){
 delete app.dataset.decoy;
 // Change colour inside the frame callback and time from there, so the clock starts when the green frame is painted.
 S.signalFrame=requestAnimationFrame(()=>{if(S.phase!=='wait'&&S.phase!=='decoy')return;setPhase('go','지금!','터치!');S.shownAt=performance.now();sfx.go();later(STAGES[S.stage].timeout*(qa&&params.get('slowmo')==='1'?8:1),miss);});
}
function tapTime(e){const t=e?.timeStamp;return typeof t==='number'&&t>0&&t<1e11&&Math.abs(performance.now()-t)<1000?t:performance.now();}
function tap(e){
 if(S.paused||disposed)return;
 if(e&&e.isTrusted===false&&!qa)return; // scripted clicks never count
 const p=S.phase;
 if(p==='intro'||p==='stage-intro'){primaryAction();return;}
 if(!['wait','decoy','go'].includes(p))return;
 const elapsed=tapTime(e)-S.shownAt,kind=classifyTap(p,elapsed);
 if(kind==='early')return falseStart(p==='decoy'?'decoy':p==='go'?'guess':'early');
 hit(recordedMs(elapsed));
}
function falseStart(reason){
 clearTimers();delete app.dataset.decoy;S.falseStarts++;S.stageFalse[S.stage]++;
 setPhase('early',reason==='decoy'?'속았어요!':'너무 빨라요!',reason==='guess'?'예측한 것 같아요 · 실수 +'+PENALTY_MS+'ms':'초록색을 기다려요 · 실수 +'+PENALTY_MS+'ms');sfx.early();renderProgress();
 later(1150,ready);
}
function hit(ms){
 clearTimers();S.trials.push(ms);S.trialInStage++;S.lastMs=ms;const g=ms<=230?'번개 같아요!':ms<=290?'날쌘 앞발!':ms<=360?'좋아요!':ms<=460?'조금 더 빠르게!':'냥이가 하품해요';
 setPhase('hit',ms+' ms',g);stage3d?.setResultMood(moodFor(ms));sfx.hit(ms);renderProgress();later(STAGES[S.stage].chain?520:1050,next);
}
function miss(){
 if(S.phase!=='go')return;clearTimers();S.trials.push(MISS_MS);S.trialInStage++;setPhase('miss','놓쳤어요',MISS_MS+'ms로 기록돼요');sfx.miss();renderProgress();later(1000,next);
}
function next(){
 const s=STAGES[S.stage];
 if(S.trialInStage<s.trials){if(s.chain){wait();renderProgress();}else ready();return;}
 if(S.stage<STAGES.length-1){S.stage++;S.trialInStage=0;stageIntro();return;}
 finish();
}
function finish(){
 clearTimers();S.activeMs=activeNow();S.activeSince=0;const r=summarize(S.trials,S.falseStarts),gr=grade(r.total);S.result=r;
 const newBest=!best||r.total<best;if(newBest){best=r.total;write('best',best);updateBest();}
 const round={score:encodeScore(r.total),roundId:S.roundId,durationMs:Math.round(S.activeMs),rankingKey:RANKING_KEY,proof:{trials:[...S.trials],falseStarts:S.falseStarts},reactionMs:r.total};
 const problem=verifyProof({score:round.score,durationMs:round.durationMs,...round.proof});
 if(!problem&&!preview){write('pending-score',round);emit('game-score',round);S.submitted=round;}
 emit('game-finished',{...round,reason:'complete'});
 setPhase('result');sfx.party();renderProgress();
 showSheet(`<p class="kicker">${gr.emoji} ${gr.title}</p><h2 class="total"><b>${r.total}</b> ms</h2><p class="hint">${gr.line}${newBest?' <span class="new">내 최고 기록!</span>':''}</p>
 <div class="rows">${STAGES.map((s,i)=>`<div><span>${s.id}단계 · ${s.name}</span><b>${r.stages[i]} ms</b></div>`).join('')}
 <div class="sub"><span>가장 빠른 한 번</span><b>${r.best<MISS_MS?r.best+' ms':'—'}</b></div><div class="sub"><span>실수 ${r.falseStarts}회${r.misses?' · 놓침 '+r.misses+'회':''}</span><b>+${r.penalty} ms</b></div></div>
 <p class="note">${problem?'이번 기록은 확인 기준을 벗어나 이 기기에만 저장돼요.':parentOrigin&&!preview?'랭킹 패널에서 오늘·전체 순위에 등록돼요.':'최고 기록은 이 기기에 저장돼요.'}</p>
 <button class="primary" data-again>다시 도전</button>`);
}
function pause(){
 if(S.paused||!['ready','wait','decoy','go','early','hit','miss'].includes(S.phase))return;
 clearTimers();S.activeMs=activeNow();S.activeSince=0;S.paused=true;S.resumePhase=S.phase;delete app.dataset.decoy;app.dataset.paused='1';
 setPhase('ready','잠깐 쉬어요','이번 시도는 다시 시작해요');pauseBtn.textContent='▶';pauseBtn.setAttribute('aria-label','계속하기');
 showSheet(`<p class="kicker">일시정지</p><h2>냥이도 쉬는 중</h2><p class="hint">진행 중이던 시도는 기록되지 않고 다시 시작해요.</p><button class="primary" data-go>계속하기</button>`);
 sheet.querySelector('[data-go]').onclick=e=>{e.stopPropagation();resume();};emit('game-paused');audio?.suspend().catch(()=>{});
}
function resume(){
 if(!S.paused)return;S.paused=false;delete app.dataset.paused;hideSheet();S.activeSince=performance.now();pauseBtn.textContent='Ⅱ';pauseBtn.setAttribute('aria-label','일시정지');unlock();emit('game-resumed');
 // A finished hit/miss already counted; anything else replays the current trial.
 if(S.resumePhase==='hit'||S.resumePhase==='miss')next();else ready();
}
function makeRoundId(){if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=b[6]&15|64;b[8]=b[8]&63|128;const h=[...b].map(n=>n.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}

// ── input ──
on(card,'pointerdown',e=>{if(e.button!==0||e.target.closest('.sheet'))return;e.preventDefault();tap(e);});
on(card,'contextmenu',e=>e.preventDefault());
on(document,'keydown',e=>{
 if(e.code==='Escape'){e.preventDefault();if(S.paused)resume();else pause();return;}
 if((e.code==='Space'||e.code==='Enter')&&!e.repeat){if(e.target.closest?.('button')&&!sheet.hidden)return;if(e.target.closest?.('.tools'))return;e.preventDefault();if(S.paused)resume();else if(S.phase==='result')startRound();else tap(e);}
});
on(muteBtn,'click',()=>{muted=!muted;write('muted',muted);updateMute();unlock();tone(480,.06);});
on(pauseBtn,'click',()=>{if(S.paused)resume();else pause();});
on(document,'visibilitychange',()=>{if(document.hidden)pause();});on(window,'blur',()=>pause());
on(window,'message',e=>{if(e.source!==window.parent||!parentOrigin||e.origin!==parentOrigin)return;const m=e.data;if(!m||m.gameId&&m.gameId!==ID)return;
 if(m.type==='game-score-saved'){const pending=read('pending-score',null);if(pending?.roundId===m.roundId)write('pending-score',null);if(S.submitted?.roundId===m.roundId)toast('랭킹에 기록했어요!');return;}
 if(m.type!=='game-command'||m.contractVersion!==CONTRACT_VERSION)return;({start:startRound,restart:startRound,pause,resume,resize:()=>stage3d?.resize(),dispose:destroy})[m.command]?.();});
on(window,'pagehide',()=>destroy());

function loop(now){if(disposed)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(stage3d){stage3d.frame(dt);stage3d.render();}raf=requestAnimationFrame(loop);}
function destroy(){if(disposed)return;disposed=true;clearTimers();cancelAnimationFrame(raf);abort.abort();S.ro?.disconnect();stage3d?.dispose();audio?.close().catch(()=>{});app.dataset.phase='disposed';}

window.gameModule=Object.freeze({start:startRound,restart:startRound,pause,resume,resize:()=>stage3d?.resize(),dispose:destroy,
 snapshot:()=>({gameId:ID,version:VERSION,phase:S.phase,paused:S.paused,stage:S.stage+1,trialInStage:S.trialInStage,trials:[...S.trials],falseStarts:S.falseStarts,roundId:S.roundId,result:S.result,best,submitted:S.submitted,decoy:app.dataset.decoy||'',cat:stage3d?.summary()??null,totalTrials:TOTAL_TRIALS})});

updateBest();updateMute();
import('./stage3d.mjs').then(({createStage})=>{if(disposed)return;stage3d=createStage(card);stage3d.setBreed(STAGES[0].breed,STAGES[0].coat);S.ro=new ResizeObserver(updateFraming);S.ro.observe(card);}).catch(err=>{console.error(err);card.classList.add('flat');})
 .finally(()=>{$('[data-boot]').hidden=true;intro();emit('game-ready',{version:VERSION});emit('game-mode',{rankingKey:RANKING_KEY});const pending=read('pending-score',null);if(pending&&!preview)emit('game-score',pending);raf=requestAnimationFrame(loop);});
