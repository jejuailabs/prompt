import {$,GameShell,loadAssets,canvasSetup,reducedMotion,toast} from './shared.js';
import {judgeStack,flightFor} from './macaron-rules.mjs';
const canvas=$('canvas'),ctx=canvasSetup(canvas),shell=new GameShell('macaron-tower',reset);
const colors=[['#f0a8b5','#cb6f90'],['#b5d3ad','#739d7b'],['#d7b8e3','#aa86c1'],['#efcf88','#ccab60'],['#b2cddd','#80a6be'],['#edbda7','#ce927a']];
let ready=false,blocks=[],moving,flight,height=0,score=0,streak=0,clock=0,cooldown=0,crumbs=[],camera=0,flash=0,falling=false;
function reset(){blocks=[{x:75,width:250,y:526,color:3}];height=0;score=0;streak=0;clock=0;cooldown=0;camera=0;crumbs=[];flash=0;falling=false;spawn();shell.setScore(0);update();$('[data-tower-note]').textContent='세 번의 PERFECT로 더 넓은 마카롱!';}
function update(){$('[data-height]').textContent=height;$('[data-combo]').textContent=streak?streak+' PERFECT':'천천히, 정확하게';}
function spawn(){flight=flightFor(height);moving={x:flight.fromLeft?-blocks.at(-1).width:400,width:blocks.at(-1).width,y:blocks.at(-1).y-30,color:height%colors.length};}
function drop(){
  if(!ready||shell.paused||shell.finished||cooldown>0||falling)return;
  const previous=blocks.at(-1),result=judgeStack(previous,moving.x,streak);
  if(!result.hit){falling=true;crumbs.push({...moving,vy:60,vx:0,angle:0,life:.6});shell.tone(170,.2);cooldown=.6;return;}
  if(result.cut&&result.cut.width>1)crumbs.push({...result.cut,y:moving.y,color:moving.color,vy:40,vx:moving.x>previous.x?55:-55,angle:0,life:1.2});
  height++;score+=result.points;streak=result.streak;blocks.push({x:result.x,width:result.width,y:moving.y,color:moving.color});shell.setScore(score);shell.save(score);update();
  flash=result.perfect?.55:0;shell.tone(result.perfect?620+Math.min(streak,5)*60:390,.12,'triangle');$('[data-tower-note]').textContent=result.restored?'3 PERFECT! 마카롱이 조금 넓어졌어요':result.perfect?'PERFECT +'+result.points+' · '+streak+' 콤보':'+'+result.points+'점 · 잘 맞춰 쌓아보세요';
  cooldown=.28;spawn();
}
function macaron(b,dy=0,angle=0){const [light,dark]=colors[b.color];ctx.save();ctx.translate(b.x+b.width/2,b.y+dy+15);ctx.rotate(angle);ctx.shadowColor='#78564a20';ctx.shadowBlur=8;ctx.shadowOffsetY=3;ctx.fillStyle=dark;ctx.beginPath();ctx.roundRect(-b.width/2,-12,b.width,27,9);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#fff2d8';ctx.fillRect(-b.width/2,-1,b.width,7);const g=ctx.createLinearGradient(0,-15,0,0);g.addColorStop(0,light);g.addColorStop(1,dark);ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(-b.width/2,-15,b.width,16,[9,9,4,4]);ctx.fill();ctx.fillStyle='#ffffff58';ctx.beginPath();ctx.roundRect(-b.width/2+Math.min(9,b.width/4),-11,Math.max(2,b.width-20),3,2);ctx.fill();if(b.width>24){ctx.fillStyle='#6c494b';ctx.beginPath();ctx.arc(-5,-3,1.2,0,Math.PI*2);ctx.arc(5,-3,1.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6c494b';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-1,2,0,Math.PI);ctx.stroke();}ctx.restore();}
function draw(dt){
  ctx.clearRect(0,0,400,600);const target=Math.max(0,height*30-285);camera+=(target-camera)*Math.min(1,dt*8);
  ctx.fillStyle='#ffffff45';ctx.beginPath();ctx.roundRect(30,28,340,39,20);ctx.fill();ctx.fillStyle='#806c5b';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText(falling?'다음 한 판은 더 높이!':'마카롱이 겹치는 순간, 탭!',200,52);
  ctx.fillStyle='#f7ebd9';ctx.shadowColor='#936d4a30';ctx.shadowBlur=16;ctx.beginPath();ctx.ellipse(200,568+camera,159,16,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  for(const b of blocks)if(b.y+camera>-40&&b.y+camera<630)macaron(b,camera);
  if(!falling&&!shell.finished){ctx.save();ctx.setLineDash([3,6]);ctx.strokeStyle='#a58d7450';ctx.beginPath();ctx.moveTo(16,moving.y+camera+15);ctx.lineTo(384,moving.y+camera+15);ctx.stroke();ctx.restore();macaron(moving,camera);}
  for(const b of crumbs){if(!shell.paused){b.vy+=500*dt;b.y+=b.vy*dt;b.x+=b.vx*dt;b.angle+=dt*(b.vx<0?-1:1);b.life-=dt;}ctx.globalAlpha=Math.max(0,Math.min(1,b.life));macaron(b,camera,b.angle);}ctx.globalAlpha=1;crumbs=crumbs.filter(b=>b.life>0);
  if(flash>0){ctx.fillStyle='#fff9d9';ctx.strokeStyle='#c6a37c';ctx.lineWidth=1;ctx.font='bold 22px Georgia';ctx.textAlign='center';ctx.fillText('PERFECT!',200,Math.max(95,moving.y+camera-15));if(!reducedMotion)for(let i=0;i<5;i++){ctx.font='14px serif';ctx.fillText('✦',70+i*65,moving.y+camera-35+Math.sin(i)*16);}}
}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();drop();});$('[data-action]').onclick=drop;
document.addEventListener('keydown',e=>{if(e.target instanceof HTMLElement&&e.target.closest('button,a'))return;if((e.key===' '||e.key==='ArrowDown')&&!e.repeat){e.preventDefault();drop();}});
void loadAssets(['patisserie-garden']).then(()=>{ready=true;reset();let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.04);last=now;if(!shell.paused&&!shell.finished){clock+=dt;cooldown=Math.max(0,cooldown-dt);flash=Math.max(0,flash-dt);if(falling){if(cooldown===0)shell.finish(score,'A lovely little tower.',height+'층 · '+score.toLocaleString()+'점\n정확한 타이밍이 더 높은 기록을 만들어요.');}else if(cooldown===0){moving.x+=(flight.fromLeft?1:-1)*(flight.speed+Math.sin(clock*2.3+flight.phase)*flight.wobble)*dt;const left=-moving.width*.45,right=400-moving.width*.55;if(moving.x>right){moving.x=right;flight.fromLeft=false;}if(moving.x<left){moving.x=left;flight.fromLeft=true;}}}draw(shell.paused?0:dt);requestAnimationFrame(frame);}requestAnimationFrame(frame);toast('완벽하게 3번 맞추면 마카롱이 넓어져요.');});
