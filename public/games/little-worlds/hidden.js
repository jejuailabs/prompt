import { $, GameShell, loadAssets, atlasStyle, atlasIcon, clamp, toast, reducedMotion } from './shared.js';
const names=['치즈','크림','턱시도','삼색이','고등어','우유'];
// Hand-placed against the generated scene: shelves, chair, pot, and crate.
const positions=[{x:13,y:12.5,size:11},{x:82,y:38,size:11},{x:64,y:52,size:14},{x:24,y:77,size:12},{x:81,y:81,size:13}];
const variations=[[0,2,1,4,3],[4,3,5,2,0],[3,1,4,0,5]];
let scene=$('[data-cat-world]'),assets,found=new Set(),elapsed=0,hints=3,hintsUsed=0,misses=0,zoom=1,pan={x:0,y:0},drag=null,round=0,started=false,ready=false,score=0;
const shell=new GameShell('hidden-paws',reset);
function renderCollection(){
  $('[data-collection]').innerHTML=variations[round%3].map((type,i)=>`<div class="collection-item ${found.has(i)?'found':'locked'}">${atlasIcon('cat-sprites',type,3,2,48)}<span>${found.has(i)?names[type]:'찾아주세요'}</span></div>`).join('');
  $('[data-found]').textContent=String(found.size);$('[data-hints]').textContent=String(hints);
}
function reset(){
  found=new Set();elapsed=0;hints=3;hintsUsed=0;misses=0;zoom=1;pan={x:0,y:0};started=false;ready=false;score=0;shell.setScore(0);
  scene.querySelectorAll('.cat-target').forEach(el=>el.remove());
  positions.forEach((p,i)=>{
    const cat=document.createElement('button');cat.type='button';cat.className='cat-target';cat.dataset.cat=String(i);cat.setAttribute('aria-label',`${names[variations[round%3][i]]} 고양이 찾기`);
    cat.style.cssText=`left:${p.x}%;top:${p.y}%;width:${p.size}%;height:${p.size*2/3}%;`;
    cat.innerHTML=`<span class="atlas-icon" style="${atlasStyle('cat-sprites',variations[round%3][i],3,2)}"></span>`;
    cat.addEventListener('click',e=>{e.stopPropagation();if(drag?.moved)return;find(i,cat);});scene.append(cat);
  });
  $('[data-timer]').textContent='00:00';$('[data-misses]').textContent='0';$('[data-zoom]').textContent='＋ 확대';$('[data-zoom]').setAttribute('aria-pressed','false');$('[data-hint]').disabled=false;renderCollection();applyTransform();
  shell.dialog('A quiet discovery.', '햇살 드는 온실에 다섯 고양이가 숨어 있어요.\n그림을 살펴보고 고양이를 눌러주세요.\n확대해서 드래그하면 더 자세히 볼 수 있어요.', '고양이 찾으러 가기',()=>{shell.closeDialog();ready=true;started=true;toast('온실 속 다섯 친구를 찾아주세요.');});
}
function find(index,element){
  if(!ready||shell.paused||shell.finished||found.has(index)||!assets)return;
  found.add(index);element.classList.add('found');element.disabled=true;renderCollection();shell.tone(470+found.size*100,.17);
  score=found.size*200;shell.setScore(score);toast(`${names[variations[round%3][index]]}를 찾았어요! ${found.size} / 5`);
  if(!reducedMotion){const ring=document.createElement('span');ring.className='find-ring';ring.style.left=element.style.left;ring.style.top=element.style.top;scene.append(ring);ring.addEventListener('animationend',()=>ring.remove());}
  if(found.size===5){score=Math.max(100,1000+Math.max(0,600-Math.floor(elapsed)*3)-hintsUsed*80-misses*15);shell.setScore(score);round++;shell.finish(score,'Everyone is home.',`다섯 친구를 모두 찾았어요!\n${Math.floor(elapsed)}초 · 힌트 ${hintsUsed}회 · ${score.toLocaleString()}점`);}
}
function applyTransform(){scene.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;}
function clampPan(){const rect=$('.stage').getBoundingClientRect();pan.x=clamp(pan.x,-rect.width*(zoom-1)/2,rect.width*(zoom-1)/2);pan.y=clamp(pan.y,-rect.height*(zoom-1)/2,rect.height*(zoom-1)/2);}
$('[data-zoom]').onclick=()=>{if(!ready||shell.paused||shell.finished)return;zoom=zoom===1?1.8:1;pan={x:0,y:0};applyTransform();$('[data-zoom]').textContent=zoom>1?'− 원래 크기':'＋ 확대';$('[data-zoom]').setAttribute('aria-pressed',String(zoom>1));if(zoom>1)toast('그림을 드래그해서 둘러보세요.');};
$('[data-hint]').onclick=()=>{if(!ready||shell.paused||shell.finished||hints<=0)return;hints--;hintsUsed++;renderCollection();const i=positions.findIndex((_,index)=>!found.has(index));const cat=scene.querySelector(`[data-cat="${i}"]`);if(zoom>1){const rect=$('.stage').getBoundingClientRect();pan.x=-(positions[i].x/100-.5)*rect.width*zoom;pan.y=-(positions[i].y/100-.5)*rect.height*zoom;clampPan();applyTransform();}cat.classList.remove('hinted');void cat.offsetWidth;cat.classList.add('hinted');cat.focus({preventScroll:true});toast('반짝이는 곳을 살펴보세요.');$('[data-hint]').disabled=hints===0;};
scene.addEventListener('pointerdown',e=>{if(!ready||shell.paused||shell.finished)return;drag={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y,moved:false};});
scene.addEventListener('pointermove',e=>{if(!drag||!ready||shell.paused||shell.finished)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>7)drag.moved=true;if(zoom>1&&drag.moved){pan.x=drag.px+dx;pan.y=drag.py+dy;clampPan();applyTransform();}});
scene.addEventListener('click',e=>{if(!ready||shell.paused||shell.finished||e.target.closest('.cat-target')||drag?.moved)return;misses++;$('[data-misses]').textContent=String(misses);toast('조금 더 자세히 살펴볼까요?');});
window.addEventListener('pointerup',()=>{if(drag)setTimeout(()=>{drag=null;},0);});window.addEventListener('pointercancel',()=>{drag=null;});window.addEventListener('resize',()=>{clampPan();applyTransform();});
async function start(){assets=await loadAssets(['hidden-greenhouse','cat-sprites']);reset();let last=performance.now();function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(started&&!shell.paused&&!shell.finished){elapsed+=dt;$('[data-timer]').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(Math.floor(elapsed%60)).padStart(2,'0')}`;}requestAnimationFrame(frame);}requestAnimationFrame(frame);}
void start();
