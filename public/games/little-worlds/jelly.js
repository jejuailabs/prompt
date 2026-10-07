import {$,GameShell,loadAssets,toast,reducedMotion} from './shared.js';
import {COLS,ROWS,STAR,connected,newGarden,playTurn} from './jelly-rules.mjs';
const names=['딸기','레몬','민트','블루베리','복숭아','반짝별'],symbols=['♥','✦','❋','◆','●','★'];
const boardEl=$('[data-board]'),shell=new GameShell('jelly-garden',reset);let state,ready=false,locked=false,focusIndex=0,unlockTimer;
function render(){
  const keepFocus=boardEl.contains(document.activeElement);
  shell.setScore(state.score);$('[data-moves]').textContent=state.moves;$('[data-order]').textContent=names[state.orderColor];$('[data-order]').dataset.color=state.orderColor;$('[data-largest]').textContent=state.largest;
  boardEl.replaceChildren(...state.board.map((color,index)=>{const b=document.createElement('button');b.type='button';b.className='jelly';b.dataset.color=color;b.dataset.index=index;b.tabIndex=index===focusIndex?0:-1;b.setAttribute('aria-label',Math.floor(index/COLS)+1+'행 '+(index%COLS+1)+'열 '+names[color]+' 젤리');b.innerHTML='<span class="jelly-shine"></span><span class="jelly-face"><i></i><i></i><em></em></span><span class="jelly-symbol">'+symbols[color]+'</span>';b.onclick=()=>pop(index);b.onpointerenter=()=>highlight(index);b.onpointerleave=()=>highlight(-1);b.onfocus=()=>{focusIndex=index;highlight(index);};b.onblur=()=>highlight(-1);b.onkeydown=e=>{const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-COLS,ArrowDown:COLS}[e.key];if(offset){e.preventDefault();focusIndex=Math.max(0,Math.min(COLS*ROWS-1,index+offset));for(const cell of boardEl.children)cell.tabIndex=Number(cell.dataset.index)===focusIndex?0:-1;boardEl.children[focusIndex].focus();}};return b;}));if(keepFocus)boardEl.children[focusIndex]?.focus({preventScroll:true});
}
function highlight(index){const group=connected(state.board,index),valid=group.length>=2;for(const cell of boardEl.children)cell.classList.toggle('selected',valid&&group.includes(Number(cell.dataset.index)));$('[data-selection]').textContent=valid?group.length+'개를 모아 터뜨리기':'같은 젤리 2개 이상을 찾아보세요';}
function reset(){clearTimeout(unlockTimer);locked=false;focusIndex=0;state=newGarden();render();$('[data-message]').textContent='큰 무리를 만들면 더 달콤한 점수!';}
function pop(index){
  if(!ready||locked||shell.paused||shell.finished)return;
  const result=playTurn(state,index);if(!result.valid){shell.tone(190,.05);toast('붙어 있는 같은 젤리 두 개부터!');return;}
  locked=true;for(const i of result.popped)boardEl.children[i].classList.add('popping');state=result.state;shell.setScore(state.score);shell.save(state.score);shell.tone(330+Math.min(result.popped.length,12)*35,.14,'triangle');
  $('[data-message]').textContent=result.points.toLocaleString()+'점 +'+(result.bonus?' · 주문 보너스!':state.combo>1?' · '+state.combo+' 콤보':'');
  const el=$('[data-pop-points]');el.textContent='+'+result.points.toLocaleString();el.classList.remove('floating');void el.offsetWidth;el.classList.add('floating');
  unlockTimer=setTimeout(()=>{locked=false;render();if(state.moves===0)shell.finish(state.score,'A sweet little garden.',state.score.toLocaleString()+'점 · 가장 큰 무리 '+state.largest+'개\n25번의 선택, 멋진 수확이었어요!');else if(result.reshuffled)toast('젤리들이 새 자리를 찾아왔어요!');},reducedMotion?0:180);
}
$('[data-action]').onclick=()=>pop(focusIndex);
void loadAssets(['patisserie-garden']).then(()=>{ready=true;reset();toast('큰 무리를 만들고, 오늘의 주문도 맞춰보세요.');});
