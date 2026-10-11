import {normalizeSpeed,levelTempo} from './speed.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function seeded(seed=421){let n=Number(seed)>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function uprightAngle(angle){return Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)));}
export class JumpWorld{
 constructor(mode='jump',seed=421){this.mode=mode;this.rng=seeded(seed);this.reset();}
 reset(){this.level=0;this.score=0;this.streak=0;this.phase='aim';this.age=0;this.x=0;this.y=0;this.vx=0;this.vy=0;this.angle=0;this.spin=0;this.charge=0;this.charging=false;this.transition=0;this.currentX=0;this.event=null;this.createTarget();}
 createTarget(){this.targetBase=this.mode==='flip'?this.currentX:this.currentX+3.25+this.rng()*1.1;this.target={x:this.targetBase,width:this.mode==='flip'?Math.max(1.1,2.2-this.level*.035):Math.max(.85,1.9-this.level*.03)};}
 begin(){if(this.phase!=='aim'||this.charging)return false;this.charging=true;this.charge=0;return true;}
 cancel(){this.charging=false;this.charge=0;}
 release(){if(this.phase!=='aim'||!this.charging)return false;this.charging=false;this.phase='flight';this.vy=5.8;this.vx=this.mode==='flip'?.10:1.6+5.2*this.charge;this.spin=this.mode==='flip'?4+3.6*this.charge:0;this.event='launch';return true;}
 tap(){if(this.mode==='flip'&&this.phase==='flight'){this.spin*=.82;return true;}return false;}
 step(seconds,multiplier=1){const total=Math.max(0,seconds)*normalizeSpeed(multiplier)*levelTempo(this.level);let remaining=total;while(remaining>1e-8&&this.phase!=='lost'){const dt=Math.min(1/120,remaining);this.advance(dt);remaining-=dt;}}
 advance(dt){this.age+=dt;this.target.x=this.targetBase+Math.sin(this.age*1.6)*Math.min(.55,this.level*.04);
  if(this.phase==='aim'){this.x=this.currentX;if(this.charging)this.charge=(this.charge+dt*.8)%1;return;}
  if(this.phase==='celebrate'){this.transition-=dt;if(this.transition<=0){this.currentX=this.x;this.phase='aim';this.angle=0;this.charge=0;this.createTarget();}return;}
  const previous=this.y;this.vy-=9.4*dt;this.x+=this.vx*dt;this.y+=this.vy*dt;this.angle+=this.spin*dt;
  if(previous>=0&&this.y<=0&&this.vy<0){
   const within=Math.abs(this.x-this.target.x)<=this.target.width/2,straight=this.mode!=='flip'||uprightAngle(this.angle)<.42;
   if(within&&straight){const perfect=this.mode==='flip'?uprightAngle(this.angle)<.18:Math.abs(this.x-this.target.x)<.18;this.x=this.target.x;this.y=0;this.vy=0;this.streak=perfect?this.streak+1:0;this.score+=100+(perfect?40+Math.min(10,this.streak)*10:0);this.level++;this.phase='celebrate';this.transition=.48;this.event=perfect?'perfect':'land';}
   else{this.phase='lost';this.event='lost';}
  }
 }
 snapshot(){return {mode:this.mode,level:this.level,score:this.score,streak:this.streak,phase:this.phase,age:this.age,x:this.x,y:this.y,angle:this.angle,spin:this.spin,charge:this.charge,charging:this.charging,currentX:this.currentX,target:{...this.target},baseTempo:levelTempo(this.level)};}
}
export class PackWorld{
 constructor(seed=421){this.rng=seeded(seed);this.reset();}
 reset(){this.boardId=0;this.level=0;this.score=0;this.phase='placing';this.transition=0;this.event=null;this.makeBoard();}
 makeBoard(){this.boardId=(this.boardId||0)+1;this.width=6;this.height=4;this.remaining=Math.max(35,75-this.level*2);const regions=[{col:0,row:0,w:6,h:4}],desired=Math.min(8,4+Math.floor(this.level/2));
  while(regions.length<desired){const candidates=regions.map((r,i)=>({r,i})).filter(({r})=>r.w>1||r.h>1).sort((a,b)=>b.r.w*b.r.h-a.r.w*a.r.h);const chosen=candidates[0];if(!chosen)break;const r=chosen.r;let vertical=r.w>1&&(r.h===1||r.w>=r.h);const max=vertical?r.w:r.h,cut=1+Math.floor(this.rng()*(max-1));regions.splice(chosen.i,1,...(vertical?[{...r,w:cut},{...r,col:r.col+cut,w:r.w-cut}]:[{...r,h:cut},{...r,row:r.row+cut,h:r.h-cut}]));}
  this.solution=regions.map((r,id)=>({...r,id,rotation:0}));this.pieces=regions.map((r,id)=>({id,w:r.w,h:r.h,col:null,row:null,rotation:0,placed:false}));if(this.level>0)for(const p of this.pieces)if(p.w!==p.h&&this.rng()>.5)p.rotation=1;this.selected=0;this.preview={col:0,row:0};this.moves=0;
 }
 dimensions(piece,rotation=piece.rotation){return rotation%2?{w:piece.h,h:piece.w}:{w:piece.w,h:piece.h};}
 select(id){if(this.phase!=='placing'||!this.pieces.some(p=>p.id===id))return false;this.selected=id;this.rotationPreview=null;return true;}
 rotate(){const p=this.pieces.find(p=>p.id===this.selected);if(!p||this.phase!=='placing')return;this.rotationPreview=((this.rotationPreview??p.rotation)+1)%2;}
 canPlace(id,col,row,rotation){const p=this.pieces.find(p=>p.id===id);if(!p||!Number.isInteger(col)||!Number.isInteger(row))return false;const size=this.dimensions(p,rotation);if(col<0||row<0||col+size.w>this.width||row+size.h>this.height)return false;return !this.pieces.some(other=>{if(other.id===id||!other.placed)return false;const d=this.dimensions(other);return col<other.col+d.w&&col+size.w>other.col&&row<other.row+d.h&&row+size.h>other.row;});}
 place(id,col,row,rotation=0){if(this.phase!=='placing'||!this.canPlace(id,col,row,rotation))return false;const p=this.pieces.find(p=>p.id===id);Object.assign(p,{col,row,rotation:rotation%2,placed:true});this.moves++;this.rotationPreview=null;this.selected=null;this.event='place';if(this.pieces.every(p=>p.placed)){this.score+=300+Math.floor(this.remaining)*3+Math.max(0,10-this.moves)*10;this.level++;this.phase='celebrate';this.transition=.65;this.event='complete';}return true;}
 step(seconds,multiplier=1){const dt=Math.max(0,seconds)*normalizeSpeed(multiplier)*levelTempo(this.level);if(this.phase==='placing'){this.remaining=Math.max(0,this.remaining-dt);if(this.remaining===0){this.phase='lost';this.event='lost';}}else if(this.phase==='celebrate'){this.transition-=dt;if(this.transition<=0){this.phase='placing';this.makeBoard();this.event='new-board';}}}
 snapshot(){return {boardId:this.boardId,level:this.level,score:this.score,phase:this.phase,remaining:this.remaining,width:this.width,height:this.height,selected:this.selected,rotationPreview:this.rotationPreview,preview:{...this.preview},moves:this.moves,pieces:this.pieces.map(p=>({...p})),baseTempo:levelTempo(this.level)};}
}
