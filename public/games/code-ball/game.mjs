import {Runtime,$,random,hash,koreanDay} from './runtime.mjs';
import {makePuzzle,feedback,solveScore} from './rules.mjs';
import {CodeEntry} from './input.mjs';

const rt=new Runtime({
 id:'code-ball',title:'Code Ball',category:'THE LITTLE BASEBALL CLUB',
 hint:'기호를 순서대로 누르세요 · 판독 후 다음 추리는 빈칸에서 시작해요',
 description:'숫자·영문자 야구로 비밀 코드를 맞혀요.\n기호를 누르면 빈칸에 순서대로 들어갑니다.\n자리까지 맞으면 스트라이크, 다른 자리에 있으면 볼.\n각 문제는 중복 없이 10번 안에 풀어보세요.'
});
$('[data-options]').innerHTML=`<div class="settings"><label>기호 <select data-alphabet><option value="number">숫자 0~9</option><option value="alpha">영문자 후보</option><option value="full">영문자 A~Z</option></select></label><label>경기 <select data-mode><option value="arcade">연속 도전</option><option value="daily">오늘의 도전 · 4문제</option><option value="practice">연습</option></select></label><label>자리 <select data-length><option value="ladder">3 → 6자리</option><option>3</option><option>4</option><option>5</option><option>6</option></select></label></div><p class="mini">오늘의 도전은 모두 같은 코드 · 한국시간 기준<br>기호를 차례로 누르기 → 판독 → 입력칸 자동 비우기</p>`;
$('[data-content]').innerHTML=`
 <div class="arena">
  <aside class="dugout">
   <div class="poster"><img src="./assets/club.webp" alt="고급스러운 작은 야구장에서 글러브를 든 고양이 코치" draggable="false"><div class="poster-title"><small>THINK. SWING. SCORE.</small><h2>Little <br>Baseball Club.</h2></div></div>
   <div class="coach-message"><span class="coach-mark">✦</span><p data-cat-speech>차근차근, 멋진 추리를 해봐요.</p></div>
   <div class="club-stats"><div><small>해결한 코드</small><b data-solved>0</b></div><div><small>이번 코드</small><b data-code-length>3자리</b></div><div><small>시간</small><b data-time>00:00</b></div></div>
   <div class="rules-card"><b>같은 기호, 같은 자리 <span>S</span></b><b>같은 기호, 다른 자리 <span>B</span></b><p>어떤 기호가 맞았는지는 알려주지 않아요.<br>기록을 보며 다음 조합을 추리하세요.</p></div>
   <button class="finish-link" data-finish>이번 점수로 경기 마무리 ↗</button>
  </aside>
  <section class="playfield">
   <header class="field-top"><div><small>YOUR NEXT GOOD GUESS</small><b data-level>1번째 코드 · 3자리</b></div><button data-help aria-label="조작과 규칙 안내">?</button></header>
   <div class="readout"><div class="last-result"><small>최근 판독</small><b data-strike>— <span>S</span></b><b data-ball>— <span>B</span></b></div><div class="tries"><b data-left>10</b><small>남은 기회</small><div data-attempt-dots></div></div></div>
   <div class="record-heading"><span>추리 기록</span><small>↺ 이전 조합을 불러와 수정할 수 있어요</small></div>
   <div class="history" data-history role="log" aria-live="polite" aria-label="추리 기록"></div>
   <div class="entry-area">
    <div class="entry-caption"><b data-entry-title>첫 번째 추리</b><span data-entry-count>0 / 3</span></div>
    <div class="slots" data-slots></div>
    <div class="keypad" data-keypad aria-label="기호 입력"></div>
    <div class="machine-actions"><button data-delete aria-label="마지막 기호 지우기">⌫</button><button data-clear>전체 지우기</button><button data-note aria-pressed="false">✎ 메모</button><button class="submit" data-submit disabled>판독하기 ↗</button><button class="submit" data-next hidden>다음 코드 ↗</button></div>
    <p class="entry-tip" data-entry-tip>기호를 누르면 빈칸에 차례로 들어가요.</p>
   </div>
   <button class="mobile-finish finish-link" data-mobile-finish>이번 점수로 마무리 ↗</button>
  </section>
 </div>`;

const inputDock=document.createElement('aside');inputDock.className='input-dock';inputDock.setAttribute('aria-label','숫자·문자 입력기');inputDock.append($('.entry-area'));$('.arena').append(inputDock);const dockObserver=new ResizeObserver(()=>rt.root.style.setProperty('--input-dock-height',inputDock.getBoundingClientRect().height+'px'));dockObserver.observe(inputDock);

let opts,puzzle,entry,attempts=0,solved=0,stageTime=0,notes=new Map(),history=[],noteMode=false,next=false,dailyRanked=true,drag=null,rng,day;
const ordinal=n=>['첫 번째','두 번째','세 번째','네 번째','다섯 번째','여섯 번째','일곱 번째','여덟 번째','아홉 번째','마지막'][n]||String(n+1)+'번째';
function reset(){
 opts={alphabet:$('[data-alphabet]').value,mode:$('[data-mode]').value,length:$('[data-length]').value};
 if(opts.mode==='daily')opts.length='ladder';
 rng=random(rt.seed+hash(rt.roundId));solved=0;day=koreanDay();dailyRanked=true;
 if(opts.mode==='daily'&&!rt.preview){const used=rt.read('daily-start:'+day+':'+opts.alphabet,false);dailyRanked=!used;rt.write('daily-start:'+day+':'+opts.alphabet,true);if(used)rt.toast('오늘의 첫 경기는 이미 시작했어요. 이번 경기는 연습입니다.');}
 rt.setRanking(opts.mode==='daily'?'daily-'+day+'-'+opts.alphabet:'arcade-'+opts.alphabet+'-'+opts.length);
 $('[data-options]').hidden=true;
 newPuzzle();
}
function newPuzzle(){
 const length=opts.length==='ladder'?Math.min(6,3+solved):Number(opts.length);
 const prng=opts.mode==='daily'?random(hash(day+':'+opts.alphabet+':'+solved)):rng;
 puzzle=makePuzzle({letters:opts.alphabet!=='number',full:opts.alphabet==='full',length,rng:prng});
 entry=new CodeEntry(length);attempts=0;notes=new Map();history=[];noteMode=false;next=false;stageTime=rt.elapsed;
 $('[data-keypad]').dataset.size=puzzle.pool.length>18?'large':puzzle.pool.length>10?'medium':'small';
 $('[data-keypad]').innerHTML=puzzle.pool.map(c=>`<button data-key="${c}" draggable="true" class="key" aria-label="${c} 입력">${c}<span class="note-mark"></span></button>`).join('');
 $('[data-slots]').innerHTML=entry.values.map((_,i)=>`<button class="slot" data-slot="${i}"><span></span><small>${i+1}</small></button>`).join('');
 $('[data-strike]').innerHTML='— <span>S</span>';$('[data-ball]').innerHTML='— <span>B</span>';
 $('[data-cat-speech]').textContent='차근차근, 멋진 추리를 해봐요.';
 renderHistory();renderEntry();renderHud();
}
function renderHud(){
 $('[data-level]').textContent=(solved+(next?0:1))+'번째 코드 · '+puzzle.secret.length+'자리';
 $('[data-code-length]').textContent=puzzle.secret.length+'자리';$('[data-solved]').textContent=solved;$('[data-left]').textContent=10-attempts;
 $('[data-attempt-dots]').innerHTML=Array.from({length:10},(_,i)=>'<i class="'+(i<attempts?'spent':'')+'"></i>').join('');
 $('[data-submit]').hidden=next;$('[data-next]').hidden=!next;
}
function renderEntry(){
 entry.values.forEach((v,i)=>{const el=$('[data-slots]').children[i];el.className='slot'+(entry.cursor===i&&!next?' selected':'')+(v?' filled':'');el.querySelector('span').textContent=v||'·';el.setAttribute('aria-label',(i+1)+'번째 자리 '+(v||'비어 있음'));el.disabled=next;});
 for(const el of $('[data-keypad]').children){
  const c=el.dataset.key,note=notes.get(c)||0,used=entry.values.includes(c);
  el.className='key'+(used?' used':'')+(note===1?' possible':note===2?' excluded':'');
  el.querySelector('.note-mark').textContent=note===1?'•':note===2?'×':'';
  el.setAttribute('aria-label',c+(note===1?' · 후보':note===2?' · 제외':'')+(used?' · 입력됨':' 입력'));
  el.disabled=next;
 }
 $('[data-entry-title]').textContent=next?'멋진 정답!':ordinal(attempts)+' 추리';
 $('[data-entry-count]').textContent=entry.values.filter(Boolean).length+' / '+entry.length;
 $('[data-submit]').disabled=!entry.full||noteMode||rt.state!=='running';
 $('[data-note]').setAttribute('aria-pressed',String(noteMode));
 $('[data-entry-tip]').textContent=noteMode?'기호를 누르면 후보 → 제외 → 해제. 우클릭도 같은 메모예요.':entry.full?'조합이 완성됐어요. 판독하거나, 칸을 눌러 수정하세요.':'기호를 순서대로 누르세요 · Backspace 지우기 / Enter 판독';
}
function renderHistory(){
 const el=$('[data-history]');
 if(!history.length){el.innerHTML='<div class="empty-record"><span>⚾</span><b>첫 추리를 기다리고 있어요.</b><p>서로 다른 기호로 시작해 정보를 모아보세요.</p></div>';return;}
 el.innerHTML=history.map((h,i)=>`<div class="attempt ${h.strikes===puzzle.secret.length?'home-run':''}"><small>${String(i+1).padStart(2,'0')}</small><div class="record-tiles">${h.guess.map(c=>'<b>'+c+'</b>').join('')}</div><div class="result"><b class="strikes">${h.strikes}<small>S</small></b><b class="balls">${h.balls}<small>B</small></b></div><button data-copy="${i}" aria-label="${i+1}번째 조합 불러오기" title="조합 불러오기">↺</button></div>`).join('');
 el.lastElementChild?.scrollIntoView({block:'nearest'});
}
function cycleNote(c){const n=((notes.get(c)||0)+1)%3;n?notes.set(c,n):notes.delete(c);renderEntry();}
function insert(c){
 if(rt.state!=='running'||next||!puzzle.pool.includes(c))return;
 if(noteMode){cycleNote(c);return;}
 const result=entry.insert(c);
 if(result==='duplicate'){rt.toast('기호는 한 번씩만 사용해요.');return;}
 if(result==='full'){rt.toast('판독하기를 누르거나 수정할 칸을 골라주세요.');return;}
 rt.tone(380+entry.values.filter(Boolean).length*55,.035);renderEntry();
}
function submit(){
 if(rt.state!=='running'||next||noteMode)return;
 if(!entry.full){rt.toast('기호를 '+entry.length+'개 채워주세요.');return;}
 const guess=[...entry.values];
 if(history.some(h=>h.guess.join('')===guess.join(''))){rt.toast('이미 판독한 조합이에요. 다른 조합으로 바꿔봐요.');return;}
 const f=feedback(puzzle.secret,guess);
 history.push({guess,...f});attempts++;
 // Every valid read starts the next entry empty, including a solved/failed guess.
 entry.clear();noteMode=false;drag=null;
 $('[data-strike]').innerHTML=f.strikes+' <span>S</span>';$('[data-ball]').innerHTML=f.balls+' <span>B</span>';
 rt.tone(f.strikes?630:270,.1);
 if(f.strikes===puzzle.secret.length){
  solved++;rt.setScore(rt.score+solveScore(puzzle.secret.length,attempts,rt.elapsed-stageTime,solved));next=true;
  $('[data-cat-speech]').textContent='홈런! '+solved+'번째 코드를 풀었어요.';rt.tone(880,.2);
 }else $('[data-cat-speech]').textContent=f.strikes===0&&f.balls===0?'이번 기호들은 모두 제외할 수 있어요.':f.strikes?'같은 기호들의 자리를 바꿔 생각해봐요.':'볼이 있어요! 기호의 다른 자리를 시험해봐요.';
 renderHistory();renderEntry();renderHud();
 if(next&&opts.mode==='daily'&&solved===4)end('오늘의 경기를 모두 풀었어요!');
 else if(!next&&attempts===10)end('아쉽게 경기가 끝났어요 · 정답 '+puzzle.secret.join(''));
}
function end(title){
 $('[data-options]').hidden=false;
 rt.finish(title,solved+'문제 해결 · '+rt.score.toLocaleString()+'점'+(opts.mode==='daily'&&!dailyRanked?'\n오늘의 재도전 · 연습 기록':''),opts.mode!=='practice'&&dailyRanked);
}
function erase(){if(rt.state==='running'&&!next){entry.erase();renderEntry();}}
function clearEntry(){if(rt.state==='running'&&!next){entry.clear();noteMode=false;renderEntry();}}
function tick(){if(!puzzle)return;const s=Math.floor(rt.elapsed-stageTime);$('[data-time]').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}

rt.on($('[data-keypad]'),'click',e=>{const c=e.target.closest('[data-key]')?.dataset.key;if(c)insert(c);});
rt.on($('[data-keypad]'),'contextmenu',e=>{e.preventDefault();const c=e.target.closest('[data-key]')?.dataset.key;if(c&&rt.state==='running'&&!next)cycleNote(c);});
rt.on($('[data-slots]'),'click',e=>{const i=e.target.closest('[data-slot]')?.dataset.slot;if(i!==undefined&&rt.state==='running'&&!next){entry.select(Number(i));renderEntry();}});
rt.on($('[data-keypad]'),'dragstart',e=>{if(noteMode||next||rt.state!=='running'){e.preventDefault();return;}drag=e.target.closest('[data-key]')?.dataset.key;e.dataTransfer?.setData('text/plain',drag||'');});
rt.on($('[data-slots]'),'dragover',e=>e.preventDefault());
rt.on($('[data-slots]'),'drop',e=>{e.preventDefault();const i=e.target.closest('[data-slot]')?.dataset.slot;if(i!==undefined&&rt.state==='running'&&!next){entry.select(Number(i));insert(drag||e.dataTransfer?.getData('text/plain'));}drag=null;});
rt.on($('[data-history]'),'click',e=>{const i=e.target.closest('[data-copy]')?.dataset.copy;if(i!==undefined&&rt.state==='running'&&!next){entry.load(history[Number(i)].guess);noteMode=false;renderEntry();rt.toast('이전 조합을 불러왔어요. 칸을 누르거나 지워서 수정하세요.');}});
rt.on($('[data-submit]'),'click',submit);
rt.on($('[data-next]'),'click',()=>{if(rt.state==='running'&&next)newPuzzle();});
rt.on($('[data-delete]'),'click',erase);rt.on($('[data-clear]'),'click',clearEntry);
rt.on($('[data-note]'),'click',()=>{if(rt.state==='running'&&!next){noteMode=!noteMode;renderEntry();}});
rt.on($('[data-finish]'),'click',()=>end('이번 점수로 경기 마무리'));
rt.on($('[data-mobile-finish]'),'click',()=>end('이번 점수로 경기 마무리'));
rt.on($('[data-help]'),'click',()=>{rt.pause();$('[data-description]').textContent='기호를 차례로 누르면 빈칸에 자동 배치됩니다.\n판독하면 조합과 S/B는 기록에 남고 입력칸은 비워져요.\nS: 같은 기호·같은 자리 / B: 같은 기호·다른 자리.\n중복 기호는 쓸 수 없고, 어느 기호가 맞았는지는 알려주지 않아요.\n칸 클릭으로 수정, Backspace 또는 ⌫로 지우기.\n전체 지우기, 이전 기록 ↺로 조합 불러오기.\n메모/우클릭은 후보·제외를 직접 표시합니다.\n숫자·영문 키보드 입력과 Enter 판독을 지원합니다.';});
rt.on(document,'keydown',e=>{
 if(rt.state!=='running'||e.target.closest('select,input'))return;
 if(e.repeat)return;
 const c=e.key.toUpperCase();
 if(puzzle.pool.includes(c)){e.preventDefault();insert(c);}
 else if(e.key==='Enter'){e.preventDefault();next?newPuzzle():submit();}
 else if(e.key==='Backspace'){e.preventDefault();erase();}
 else if(e.key==='Delete'){e.preventDefault();clearEntry();}
 else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();entry.move(e.key==='ArrowLeft'?-1:1);renderEntry();}
});
rt.ready({dispose:()=>dockObserver.disconnect(),
 reset,tick,clearInput:()=>{drag=null;},
 state:state=>{if(entry){$('[data-options]').hidden=state==='running';renderEntry();}},
 snapshot:()=>({solved,attempts,guess:[...(entry?.values||[])],cursor:entry?.cursor,pool:puzzle?.pool,length:puzzle?.secret.length,next,notes:[...notes],noteMode,history:structuredClone(history),options:opts,...(rt.qa?{secret:puzzle?.secret}: {})})
});
