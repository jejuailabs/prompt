// Deterministic celebration physics, independent of the renderer and host.
export const FINALE_GRAVITY=7.8;
export const LANDING_Y=-.58+1.02/2;
export function createFinale(origins,{ground=LANDING_Y,reducedMotion=false}={}){
 return {age:0,settledFor:0,done:false,ground,reducedMotion,
  actors:origins.map((origin,index)=>{const angle=index*2.3999632297,ring=3.1+(index%4)*.6,target={x:Math.cos(angle)*ring,z:Math.sin(angle)*ring};
   const flight=(3.4+Math.sqrt(3.4**2+2*FINALE_GRAVITY*Math.max(0,origin.y-ground)))/FINALE_GRAVITY;
   return {index,origin:{...origin},position:{...origin},velocity:{x:(target.x-origin.x)/flight,y:3.4,z:(target.z-origin.z)/flight},rotation:{x:0,y:0,z:0},spin:(index%2?1:-1)*(.16+index%3*.04),delay:Math.min(.5,(origins.length-1-index)*.035),launched:false,landed:false,bounces:0,squash:0};
  })};
}
export function stepFinale(finale,dt){
 if(finale.done||dt<=0)return finale;
 finale.age+=dt;
 for(const actor of finale.actors){
  if(finale.age<actor.delay)continue;
  actor.launched=true;
  if(actor.landed){actor.squash=Math.max(0,actor.squash-dt*2.4);continue;}
  actor.velocity.y-=FINALE_GRAVITY*dt;
  for(const axis of['x','y','z'])actor.position[axis]+=actor.velocity[axis]*dt;
  if(!finale.reducedMotion){actor.rotation.z+=actor.spin*dt;actor.rotation.x=Math.sin((finale.age-actor.delay)*2+actor.index)*.10;actor.rotation.y=Math.sin((finale.age-actor.delay)*1.2+actor.index)*.17;}
  if(actor.position.y<=finale.ground){
   actor.position.y=finale.ground;actor.squash=.30;
   if(actor.bounces===0&&Math.abs(actor.velocity.y)>.8){actor.bounces++;actor.velocity.y=Math.min(2.5,Math.abs(actor.velocity.y)*.22);actor.velocity.x*=.18;actor.velocity.z*=.18;}
   else {actor.landed=true;actor.velocity={x:0,y:0,z:0};actor.rotation={x:0,y:0,z:0};}
  }
 }
 if(finale.actors.every(actor=>actor.landed))finale.settledFor+=dt;
 if(finale.settledFor>=.75)finale.done=true;
 return finale;
}
export function finaleSummary(finale){return finale?{age:finale.age,done:finale.done,landed:finale.actors.filter(a=>a.landed).length,total:finale.actors.length,ground:finale.ground,actors:finale.actors.map(a=>({index:a.index,x:a.position.x,y:a.position.y,z:a.position.z,landed:a.landed,bounces:a.bounces,launched:a.launched}))}:null;}
