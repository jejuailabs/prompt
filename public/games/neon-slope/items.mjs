// One-round progression, independent of rendering and the host project.
export const LETTERS=['L','I','F','E'];
export const SPEED_SECONDS=6;
export function newRun(){return{lives:1,letters:[],earned:0,effect:null,effectTime:0};}
export function speedFor(elapsed,run){const base=Math.min(15,9+Math.max(0,elapsed)*.04);return Math.max(6.5,base*(run.effect==='up'?1.25:run.effect==='down'?.72:1));}
export function tickItems(run,dt){run.effectTime=Math.max(0,run.effectTime-dt);if(run.effectTime===0)run.effect=null;}
export function collectItem(run,item){if(item.kind==='letter'){if(!LETTERS.includes(item.letter)||run.letters.includes(item.letter))return'duplicate';run.letters.push(item.letter);if(run.letters.length===4){run.lives++;run.earned++;run.letters=[];return'life';}return'letter';}if(item.kind==='up'||item.kind==='down'){run.effect=item.kind;run.effectTime=SPEED_SECONDS;return item.kind;}return null;}
export function loseLife(run){run.lives=Math.max(0,run.lives-1);return run.lives>0;}
export function pickupHit(from,to,item,radius=.62){const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,length=dx*dx+dy*dy+dz*dz;const u=length?Math.max(0,Math.min(1,((item.x-from.x)*dx+(item.y-from.y)*dy+(item.z-from.z)*dz)/length)):0;return Math.hypot(from.x+dx*u-item.x,from.y+dy*u-item.y,from.z+dz*u-item.z)<radius+.46;}
export function trackItems(t,obstacles=[]){if(t.end-t.start<12)return[];const length=t.end-t.start,items=[{kind:'letter',letter:LETTERS[t.index%4],x:t.x,z:t.start+length*.24}];if(t.index%3===2){const side=Math.sign((obstacles[0]?.x??t.x+1)-t.x)||1;items.push({kind:Math.floor(t.index/3)%2?'down':'up',x:t.x-side*1.35,z:t.start+length*.82});}return items;}
export function recoveryPose(ball,tracks,obstacles){const t=tracks.find(t=>ball.z>=t.start&&ball.z<=t.end)||[...tracks].reverse().find(t=>t.end<ball.z)||tracks[0];const z=Math.max(t.start+1,Math.min(t.end-2,ball.z-4));const hazard=obstacles.find(b=>Math.abs(b.z-z)<3);const x=t.x+(hazard?-Math.sign(hazard.x-t.x)*Math.min(1.6,t.width/2-1):0);return{x,z};}
