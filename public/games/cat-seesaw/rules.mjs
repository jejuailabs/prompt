
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function random(seed=421){let n=seed>>>0;return()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const RADII=[.49,.59,.71,.84,.98,1.13,1.30];
function integrate(world,seconds,fn){let left=clamp(Number(seconds)||0,0,30);while(left>1e-7&&world.phase!=='done'){const dt=Math.min(1/120,left);world.time+=dt;fn(dt);left-=dt;}}
export class MergeWorld{
 constructor(seed=421){this.rng=random(seed);this.reset();}
 reset(){this.cats=[];this.id=0;this.time=0;this.score=0;this.level=0;this.phase='play';this.combo=0;this.lastMerge=-10;this.cooldown=0;this.danger=0;this.events=[];this.aim=0;this.next=this.pick();}
 pick(){return {tier:Math.floor(this.rng()*(this.level>=6?3:this.level>=2?2:1)),coat:Math.floor(this.rng()*4)};}
 drop(x=this.aim){if(this.phase!=='play'||this.cooldown>0)return false;const tier=this.next.tier,r=RADII[tier];this.cats.push({id:++this.id,tier,coat:this.next.coat,r,x:clamp(x,-3.8+r,3.8-r),y:2.9,vx:0,vy:0,angle:0,spin:0,age:0});this.next=this.pick();this.cooldown=.45;return true;}
 step(seconds){integrate(this,seconds,dt=>{
  this.cooldown=Math.max(0,this.cooldown-dt);
  for(const c of this.cats){c.age+=dt;c.vy-=8.4*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.angle+=c.spin*dt;c.vx*=Math.exp(-.75*dt);c.spin*=Math.exp(-2*dt);if(c.x-c.r<-3.8){c.x=-3.8+c.r;c.vx=Math.abs(c.vx)*.3;}if(c.x+c.r>3.8){c.x=3.8-c.r;c.vx=-Math.abs(c.vx)*.3;}if(c.y-c.r<-3.9){c.y=-3.9+c.r;c.vy=Math.abs(c.vy)>.4?Math.abs(c.vy)*.18:0;c.vx*=.95;c.spin*=.92;}}
  let merged=false;
  for(let pass=0;pass<4;pass++)for(let i=0;i<this.cats.length;i++)for(let j=i+1;j<this.cats.length;j++){
   const a=this.cats[i],b=this.cats[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),sum=a.r+b.r;if(d>=sum)continue;
   if(!merged&&a.tier===b.tier&&a.tier<6){
    const tier=a.tier+1,c={id:++this.id,tier,coat:0,r:RADII[tier],x:(a.x+b.x)/2,y:(a.y+b.y)/2,vx:(a.vx+b.vx)/2,vy:Math.max(1.8,(a.vy+b.vy)/2),angle:0,spin:0,age:0};
    this.cats.splice(j,1);this.cats.splice(i,1,c);this.combo=this.time-this.lastMerge<1.2?this.combo+1:1;this.lastMerge=this.time;const points=(tier+1)*25+Math.min(8,this.combo)*10;this.score+=points;this.level=Math.max(this.level,tier);this.events.push({type:'merge',x:c.x,y:c.y,tier,points,combo:this.combo});merged=true;break;
   }
   const nx=d>.0001?dx/d:1,ny=d>.0001?dy/d:0,ma=a.r*a.r,mb=b.r*b.r,overlap=(sum-d)*.52;a.x-=nx*overlap*mb/(ma+mb);a.y-=ny*overlap*mb/(ma+mb);b.x+=nx*overlap*ma/(ma+mb);b.y+=ny*overlap*ma/(ma+mb);
   const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){const impulse=-rv*1.15/(1/ma+1/mb);a.vx-=impulse*nx/ma;a.vy-=impulse*ny/ma;b.vx+=impulse*nx/mb;b.vy+=impulse*ny/mb;a.spin-=nx*.08;b.spin+=nx*.08;}
  }
  const danger=this.cats.some(c=>c.age>1.2&&c.y+c.r>2.1);this.danger=danger?this.danger+dt:Math.max(0,this.danger-dt*2);if(this.danger>2.5){this.phase='done';this.events.push({type:'end'});}
 });}
 snapshot(){return{mode:'merge',phase:this.phase,score:this.score,level:this.level,cooldown:this.cooldown,combo:this.combo,danger:this.danger,next:{...this.next},aim:this.aim,cats:this.cats.map(c=>({...c}))};}
}
export class BalanceWorld{
 constructor(seed=421){this.rng=random(seed);this.reset();}
 reset(){this.cats=[];this.id=0;this.time=0;this.score=0;this.level=0;this.phase='play';this.angle=0;this.omega=0;this.cooldown=0;this.nextX=0;this.movePhase=0;this.events=[];this.finale=0;}
 drop(){if(this.phase!=='play'||this.cooldown>0)return false;this.cats.push({id:++this.id,x:this.nextX,y:Math.max(2.9,...this.cats.filter(c=>c.landed).map(c=>c.y+1.4)),vx:0,vy:0,localX:0,localY:0,landed:false,r:.58,age:0});this.cooldown=.6;return true;}
 step(seconds){integrate(this,seconds,dt=>{
  this.cooldown=Math.max(0,this.cooldown-dt);this.movePhase+=dt*(.8+Math.min(.6,this.level*.025));this.nextX=Math.sin(this.movePhase)*3.55;
  if(this.phase==='dive'){this.finale+=dt;for(const c of this.cats){c.vy-=8.4*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.y<-4){c.y=-4;c.vy=0;}}if(this.finale>2.4){this.phase='done';this.events.push({type:'end'});}return;}
  const on=this.cats.filter(c=>c.landed);let torque=0;for(const c of on)torque+=c.localX*Math.cos(this.angle)-c.localY*Math.sin(this.angle);
  this.omega+=(-torque*.23-this.omega*2.2-this.angle*.65)*dt;this.angle+=this.omega*dt;
  const cos=Math.cos(this.angle),sin=Math.sin(this.angle);
  for(const c of this.cats){c.age+=dt;if(c.landed){if(Math.abs(this.angle)>.18)c.localX-=Math.sin(this.angle)*dt*(.7+c.localY*.14);c.x=c.localX*cos-c.localY*sin;c.y=-1.6+c.localX*sin+c.localY*cos;continue;}
   const previous=c.y;c.vy-=8.4*dt;c.y+=c.vy*dt;const localX=c.x*cos+(c.y+1.6)*sin;let top=.34+c.r;
   for(const other of on)if(Math.abs(localX-other.localX)<c.r+other.r-.08)top=Math.max(top,other.localY+2*c.r-.10);
   const surface=-1.6+localX*sin+top*cos;
   if(c.vy<0&&previous>=surface&&c.y<=surface&&Math.abs(localX)<4.0){c.landed=true;c.localX=localX;c.localY=top;c.y=surface;c.vy=0;this.level++;const perfect=Math.abs(localX)<.65;const points=100+(perfect?50:0);this.score+=points;this.events.push({type:'land',x:c.x,y:c.y,perfect,points});}
  }
  if(Math.abs(this.angle)>.72||this.cats.some(c=>c.landed&&Math.abs(c.localX)>4.25||!c.landed&&c.y<-4.5)){
   this.phase='dive';for(const c of this.cats){c.vx=c.x*.65;c.vy=2.8+this.rng();c.landed=false;}this.events.push({type:'dive'});
  }
 });}
 snapshot(){return{mode:'balance',phase:this.phase,score:this.score,level:this.level,angle:this.angle,cooldown:this.cooldown,nextX:this.nextX,cats:this.cats.map(c=>({...c}))};}
}
export class SlingWorld{
 constructor(seed=421){this.rng=random(seed);this.reset();}
 reset(){this.time=0;this.level=0;this.score=0;this.lives=3;this.id=0;this.cats=[];this.phase='aim';this.projectile=null;this.aim={x:1.0,y:1.3};this.events=[];this.transition=0;this.makeTargets();}
 makeTargets(){this.targets=Array.from({length:3},(_,i)=>({id:i,x:.1+i*1.25+(this.rng()-.5)*.28,y:-2.8+i*.65,width:Math.max(.66,1.15-this.level*.035),filled:false,baseX:0}));for(const t of this.targets)t.baseX=t.x;this.bumpers=this.level>=2?[{x:-.35,y:-.5,r:.32}]:[];}
 setAim(x,y){this.aim={x:clamp(x,.15,1.8),y:clamp(y,.35,2.0)};}
 launch(){if(this.phase!=='aim')return false;this.projectile={id:++this.id,x:-3.1,y:-3.15,vx:this.aim.x*5.4,vy:this.aim.y*5.4,age:0,angle:0};this.phase='flight';this.events.push({type:'launch'});return true;}
 trajectory(){let x=-3.1,y=-3.15,vx=this.aim.x*5.4,vy=this.aim.y*5.4;const points=[];for(let i=0;i<30;i++){for(let j=0;j<7;j++){const dt=.055/7;vy-=9.2*dt;x+=vx*dt;y+=vy*dt;if(x>4.05){x=4.05;vx=-Math.abs(vx)*.76;}if(x<-4.2){x=-4.2;vx=Math.abs(vx)*.76;}for(const b of this.bumpers){const dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy);if(d<b.r+.32){const nx=dx/(d||1),ny=dy/(d||1),v=vx*nx+vy*ny;x=b.x+nx*(b.r+.33);y=b.y+ny*(b.r+.33);if(v<0){vx-=1.8*v*nx;vy-=1.8*v*ny;}}}}points.push({x,y});if(y<-3.8)break;}return points;}
 miss(){this.lives--;this.projectile=null;this.phase=this.lives>0?'recover':'done';this.transition=.7;this.events.push({type:this.lives>0?'miss':'end'});}
 step(seconds){integrate(this,seconds,dt=>{
  for(const t of this.targets)t.x=t.baseX+(this.level>=1?Math.sin(this.time*1.4+t.id)*Math.min(.35,this.level*.07):0);
  for(const c of this.cats){const t=this.targets.find(t=>t.id===c.target);if(t){c.x=t.x;c.y=t.y+.35;}}
  if(this.phase==='recover'||this.phase==='celebrate'){this.transition-=dt;if(this.transition<=0){if(this.phase==='celebrate'){this.level++;this.cats=[];this.makeTargets();}this.phase='aim';}return;}
  if(this.phase!=='flight')return;const c=this.projectile,previous=c.y;c.age+=dt;c.vy-=9.2*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.angle+=c.vx*.07*dt;
  if(c.x>4.05){c.x=4.05;c.vx=-Math.abs(c.vx)*.76;this.events.push({type:'bounce'});}if(c.x<-4.2){c.x=-4.2;c.vx=Math.abs(c.vx)*.76;}
  for(const b of this.bumpers){const dx=c.x-b.x,dy=c.y-b.y,d=Math.hypot(dx,dy);if(d<b.r+.32){const nx=dx/(d||1),ny=dy/(d||1),v=c.vx*nx+c.vy*ny;c.x=b.x+nx*(b.r+.33);c.y=b.y+ny*(b.r+.33);if(v<0){c.vx-=1.8*v*nx;c.vy-=1.8*v*ny;}}}
  for(const t of this.targets)if(!t.filled&&c.vy<0&&previous>=t.y+.35&&c.y<=t.y+.35&&Math.abs(c.x-t.x)<t.width/2){
   const perfect=Math.abs(c.x-t.x)<.14;t.filled=true;this.cats.push({id:c.id,x:t.x,y:t.y+.35,target:t.id});const points=150+(perfect?75:0)+this.level*10;this.score+=points;this.projectile=null;this.events.push({type:'land',x:t.x,y:t.y,perfect,points});
   if(this.targets.every(t=>t.filled)){this.phase='celebrate';this.transition=1.0;this.score+=200;this.events.push({type:'complete'});}else this.phase='aim';return;
  }
  if(c.y<-4.6||c.age>5)this.miss();
 });}
 snapshot(){return{mode:'sling',phase:this.phase,score:this.score,level:this.level,lives:this.lives,aim:{...this.aim},targets:this.targets.map(t=>({...t})),projectile:this.projectile?{...this.projectile}:null,cats:this.cats.map(c=>({...c}))};}
}
