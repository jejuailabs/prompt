import { $, GameShell, loadAssets, canvasSetup, drawSprite, pointerPosition, atlasIcon, clamp, reducedMotion, toast } from './shared.js';
import { FruitWorld, RADII } from './fruit-physics.mjs';

const names = ['체리','딸기','살구','귤','복숭아','사과','배','멜론','수박'];
const canvas = $('canvas'), ctx = canvasSetup(canvas);
let assets, world, score = 0, dropX = 200, next = 0, following = 1, cooldown = 0, danger = 0, elapsed = 0, particles = [], maxLevel = 0;
const shell = new GameShell('fruit-atelier', reset);
const randomFruit = () => Math.floor(Math.random() * 4);

function reset() {
  score=0;maxLevel=0;cooldown=0;danger=0;elapsed=0;particles=[];next=0;following=1;
  world = new FruitWorld((body, points) => {
    score += points; maxLevel = Math.max(maxLevel, body.level); shell.setScore(score); shell.save(score);
    $('[data-largest]').textContent = names[maxLevel];
    shell.tone(300 + body.level * 90, .16);
    if(!reducedMotion) for(let i=0;i<13;i++){const angle=Math.random()*Math.PI*2;particles.push({x:body.x,y:body.y,vx:Math.cos(angle)*100,vy:Math.sin(angle)*100,life:.7,color:['#fff5bf','#ffc586','#d9d996'][i%3]});}
    if (body.level === 8) shell.finish(score, 'Sweet perfection.', `수박을 완성했어요!\n최종 점수 ${score.toLocaleString()}점`);
  });
  // A small, stable opening arrangement makes the first merge easy to discover.
  world.add(1, 94, 530); world.add(2, 152, 525); world.add(0, 201, 538); world.add(3, 252, 521); world.add(0, 309, 538);
  shell.setScore(0);$('[data-largest]').textContent='체리'; updateNext();
}
function updateNext(){ $('[data-next]').innerHTML=atlasIcon('fruit-sprites',following,3,3,33); $('[data-current]').textContent=names[next]; }
function drop() {
  if(!assets || shell.paused || shell.finished || cooldown > 0)return;
  world.add(next,dropX); cooldown=.43; next=following; following=randomFruit();updateNext();shell.tone(240,.06);
}
canvas.addEventListener('pointermove',e=>{dropX=clamp(pointerPosition(e,canvas).x,29+RADII[next],371-RADII[next]);});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();dropX=clamp(pointerPosition(e,canvas).x,29+RADII[next],371-RADII[next]);drop();});
$('[data-action]').onclick=drop;
document.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLElement && e.target.closest('button,a'))return;
  if(['ArrowLeft','ArrowRight',' ','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')dropX=clamp(dropX-18,29+RADII[next],371-RADII[next]);else if(e.key==='ArrowRight')dropX=clamp(dropX+18,29+RADII[next],371-RADII[next]);else if(!e.repeat)drop();}
});
$('[data-evolution]').innerHTML=names.map((name,i)=>`<span title="${name}">${atlasIcon('fruit-sprites',i,3,3,43)}</span>${i<8?'<span class="arrow">›</span>':''}`).join('');
function draw(dt){
  ctx.clearRect(0,0,400,600);
  // The vessel is code-rendered so its edge and collision boundaries agree.
  ctx.fillStyle='#49321d20';ctx.beginPath();ctx.ellipse(200,565,180,15,0,0,Math.PI*2);ctx.fill();
  const glass=ctx.createLinearGradient(29,0,371,0);glass.addColorStop(0,'#fff6');glass.addColorStop(.12,'#ffffff12');glass.addColorStop(.8,'#fff1');glass.addColorStop(1,'#fff6');
  ctx.fillStyle=glass;ctx.beginPath();ctx.roundRect(26,130,348,430,[7,7,29,29]);ctx.fill();
  ctx.strokeStyle='#fff9';ctx.lineWidth=3;ctx.stroke();
  ctx.beginPath();ctx.moveTo(34,147);ctx.lineTo(34,524);ctx.quadraticCurveTo(34,549,52,549);ctx.strokeStyle='#fff5';ctx.lineWidth=4;ctx.stroke();
  ctx.save();ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(35,155);ctx.lineTo(365,155);ctx.strokeStyle=danger>0?'#c45445cc':'#fff8';ctx.lineWidth=1;ctx.stroke();ctx.restore();
  if(!shell.finished){
    const x=clamp(dropX,29+RADII[next],371-RADII[next]);
    ctx.save();ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(x,107);ctx.lineTo(x,538);ctx.strokeStyle='#fff7';ctx.stroke();ctx.restore();
    ctx.globalAlpha=cooldown>0?.4:1;drawSprite(ctx,assets['fruit-sprites'],next,x,83,RADII[next]*2.65);ctx.globalAlpha=1;
    ctx.fillStyle='#654f39';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('여기를 눌러 떨어뜨리기',200,29);
  }
  for(const b of world.bodies){drawSprite(ctx,assets['fruit-sprites'],b.level,b.x,b.y,b.r*2.65*b.scale,3,3,b.angle);}
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;ctx.globalAlpha=Math.max(0,p.life/.7);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);
  if(danger>0){ctx.fillStyle='#a34736';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('과일이 넘치기 전에 합쳐주세요',200,584);}
}
async function start(){
  assets=await loadAssets(['fruit-cafe','fruit-sprites']);reset();
  let last=performance.now(),accumulator=0;
  function frame(now){const dt=Math.min((now-last)/1000,.04);last=now;
    if(!shell.paused&&!shell.finished){elapsed+=dt;cooldown=Math.max(0,cooldown-dt);accumulator+=dt;while(accumulator>=1/60){world.step(1/60);accumulator-=1/60;}danger=world.isOverflowing()?danger+dt:0;if(danger>1.8)shell.finish(score,'A lovely harvest.',`오늘의 수확 ${score.toLocaleString()}점\n가장 큰 과일: ${names[maxLevel]}`);}
    draw(shell.paused?0:dt);requestAnimationFrame(frame);
  }requestAnimationFrame(frame);toast('같은 과일을 만나게 해주세요.');
}
void start();
