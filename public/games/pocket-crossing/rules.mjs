export function sweptHit(from,to,actor,margin=.22){
 let lo=0,hi=1;const rel0={x:from.x-actor.previousX,z:from.z-actor.z},rel1={x:to.x-actor.x,z:to.z-actor.z};
 for(const [axis,half]of[['x',actor.width/2+margin],['z',actor.depth/2+margin]]){const a=rel0[axis],d=rel1[axis]-a;if(Math.abs(d)<1e-9){if(Math.abs(a)>half)return false;continue;}let t0=(-half-a)/d,t1=(half-a)/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return false;}return hi>=0&&lo<=1;
}
export function logUnder(logs,x,margin=.19){return logs.find(log=>Math.abs(x-log.x)<=log.width/2-margin)||null;}
export function crossingScore(furthest,coins){return Math.max(0,Math.floor(furthest))*10+Math.max(0,Math.floor(coins))*25;}
export function laneType(index,rng=Math.random){if(index<=0)return'grass';const intro=['grass','road','road','grass','river','river','grass','rail','grass'];if(index<intro.length)return intro[index];if(index%7===0)return'grass';const roll=rng();return roll<.47?'road':roll<.72?'grass':roll<.91?'river':'rail';}