import { $, GameShell, loadAssets, canvasSetup, drawSprite, atlasIcon, readStore, writeStore, reducedMotion, toast } from './shared.js';
import { FISH, judgeCatch, catchPoints } from './fishing-rules.mjs';
const ctx=canvasSetup($('canvas'));
let assets,score=0,round=0,streak=0,time=0,mode='ready',modeTime=0,position=.1,center=.5,width=.28,target=0,caught=0;
let collection=readStore('tidelight:collection',[]); if(!Array.isArray(collection))collection=[];
const shell=new GameShell('tidelight',reset);
const swimmers=Array.from({length:7},(_,i)=>({x:40+i*57,y:323+(i%3)*65,speed:11+(i%4)*7,index:i%6,phase:i*1.7,dir:i%2?1:-1}));
function updateCollection(){
  $('[data-collection]').innerHTML=FISH.map((fish,i)=>`<div class="collection-item ${collection.includes(i)?'found':'locked'}" title="${fish.name} · ${fish.rarity}">${atlasIcon('fish-sprites',i,3,2,52)}<span>${collection.includes(i)?fish.name:'아직 발견 전'}</span></div>`).join('');
  $('[data-collected]').textContent=`${collection.length} / 6`;
}
function reset(){score=0;round=0;streak=0;time=0;mode='ready';modeTime=0;caught=0;position=.1;shell.setScore(0);$('[data-catch-card]').hidden=true;$('[data-round]').textContent='다섯 번의 작은 모험';$('[data-streak]').textContent='0';$('[data-action]').textContent='낚싯줄 던지기';$('[data-status]').textContent='마음이 준비되면 시작하세요';$('[data-remaining]').textContent='5번의 기회';updateCollection();}
function cast(){round++;mode='waiting';modeTime=.9+Math.random()*1.3;target=Math.floor(Math.random()*4);position=.06;center=.4+Math.random()*.2;width=Math.max(.25,.34-round*.015);$('[data-needle]').style.left='6%';$('[data-round]').textContent=`CAST ${String(round).padStart(2,'0')} / 05`;$('[data-catch-card]').hidden=true;$('[data-action]').textContent='입질을 기다리는 중…';$('[data-status]').textContent='찌를 바라보세요';$('[data-remaining]').textContent=`${6-round}번의 기회`;$('[data-zone]').style.left=`${(center-width/2)*100}%`;$('[data-zone]').style.width=`${width*100}%`;$('[data-perfect]').style.left=`${(center-width*.16)*100}%`;$('[data-perfect]').style.width=`${width*.32*100}%`;shell.tone(310,.08);}
function resolve(){
  const judgement=judgeCatch(position,center,width);mode='result';modeTime=0;
  if(judgement==='miss'){streak=0;$('[data-catch-card]').innerHTML='<span class="eyebrow">SO CLOSE</span><h3>다음을 기다려요.</h3><p>초록 구간에서 줄을 당겨주세요.</p>';shell.tone(170,.18);}
  else{
    streak++;caught++;if(judgement==='perfect')target=Math.min(5,target+2);
    const fish=FISH[target],points=catchPoints(target,judgement,streak);score+=points;shell.setScore(score);shell.save(score);
    const isNew=!collection.includes(target);if(isNew){collection.push(target);writeStore('tidelight:collection',collection);updateCollection();}
    $('[data-catch-card]').innerHTML=`<span class="eyebrow">${judgement==='perfect'?'PERFECT CATCH':fish.rarity}</span><div>${atlasIcon('fish-sprites',target,3,2,110)}</div><h3>${fish.name}</h3><p>+${points}점${isNew?' · 도감에 새로 기록했어요':''}</p>`;
    shell.tone(judgement==='perfect'?820:560,.23);
  }
  $('[data-streak]').textContent=String(streak);$('[data-catch-card]').hidden=false;$('[data-status]').textContent=judgement==='miss'?'아쉽게 놓쳤어요':'멋진 한 마리!';$('[data-action]').textContent=round>=5?'오늘의 수확 보기':'다시 낚싯줄 던지기';
}
function action(){if(!assets||shell.paused||shell.finished)return;if(mode==='ready'||(mode==='result'&&round<5))cast();else if(mode==='bite')resolve();else if(mode==='result')shell.finish(score,'See you at sunset.',`다섯 번의 낚시에서 ${caught}마리를 만났어요.\n오늘의 수확 ${score.toLocaleString()}점 · 도감 ${collection.length}/6`);}
$('[data-action]').onclick=action;
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!e.target.closest('button,a')){e.preventDefault();action();}});
function draw(){ctx.clearRect(0,0,400,600);
  for(const f of swimmers){const x=((f.x+f.dir*time*f.speed)%500+500)%500-50,y=f.y+Math.sin(time*.8+f.phase)*9;ctx.save();ctx.translate(x,y);ctx.scale(f.dir,1);ctx.globalAlpha=.83;drawSprite(ctx,assets['fish-sprites'],f.index,0,0,f.index===5?74:62,3,2,Math.sin(time+f.phase)*.04);ctx.restore();}
  const bobY=252+Math.sin(time*2)*2+(mode==='bite'?Math.sin(time*21)*5:0);const bobX=269+Math.sin(time*.6)*4;
  if(mode!=='ready'){ctx.beginPath();ctx.moveTo(217,89);ctx.quadraticCurveTo(262,124,bobX,bobY);ctx.strokeStyle='#fcf5d0b3';ctx.lineWidth=.8;ctx.stroke();ctx.save();ctx.strokeStyle='#ffffff70';for(let i=0;i<3;i++){const r=((time*10+i*10)%30)+4;ctx.globalAlpha=1-r/40;ctx.beginPath();ctx.ellipse(bobX,bobY+4,r,r*.24,0,0,Math.PI*2);ctx.stroke();}ctx.restore();ctx.fillStyle='#fff8df';ctx.beginPath();ctx.ellipse(bobX,bobY,3,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d46f4f';ctx.beginPath();ctx.arc(bobX,bobY-3,3,Math.PI,0);ctx.fill();}
  if(!reducedMotion){ctx.fillStyle='#e6fffc75';for(let i=0;i<11;i++){const y=570-((time*12+i*31)%265);ctx.beginPath();ctx.arc(50+(i*73)%330,y,1.1+(i%3)*.5,0,Math.PI*2);ctx.fill();}}
}
async function start(){assets=await loadAssets(['tidelight-harbor','fish-sprites']);reset();let last=performance.now();function frame(now){const dt=Math.min(.04,(now-last)/1000);last=now;if(!shell.paused&&!shell.finished){time+=dt;if(mode==='waiting'){modeTime-=dt;if(modeTime<=0){mode='bite';modeTime=0;shell.tone(680,.11);$('[data-action]').textContent='지금, 줄 당기기!';$('[data-status]').textContent='초록 구간에서 탭!';toast('입질이에요! 초록 구간을 노려보세요.');}}else if(mode==='bite'){modeTime+=dt;position=.5+Math.sin(modeTime*(1.5+round*.18)-Math.PI/2)*.47;$('[data-needle]').style.left=`${position*100}%`;$('[data-remaining]').textContent=`${Math.max(0,Math.ceil(7-modeTime))}초`;if(modeTime>=7){position=0;resolve();}}}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);}
void start();
