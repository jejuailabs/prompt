import {STAGE_TWO_START,trackHeight,bankAt} from './rules.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function nextTrack(prev,index,rng){
 const stage=prev&&prev.end>=STAGE_TWO_START?2:1;
 const serial=stage===2?(prev?.stage===2?prev.serial+1:0):index;
 const longGap=stage===2&&serial>1&&serial%4===3;
 // Stage one stays continuous; stage-two jumps remain reachable during slow-down.
 let gap=longGap?4.4+rng()*.8:0;
 if(stage===1&&prev&&prev.end+gap>STAGE_TWO_START-8)gap=0;
 const start=prev?prev.end+gap:0;let length=index<3?24:stage===2?22+rng()*5:18+rng()*7;
 if(stage===1&&start+length>=STAGE_TWO_START-8)length=STAGE_TWO_START-start;
 const width=index<4?8.6:stage===2?8.2: index%6===5?5.4:7+rng()*1.2;
 const x=prev?clamp(prev.x+(rng()-.5)*(stage===2?.8:1.2),-5,5):0;
 const slope=.13+rng()*.07,bankStart=prev?bankAt(prev,prev.end):0;
 const bankEnd=stage===2?(serial%3===0?.3:serial%3===1?-.3:0):0;
 const y=prev?trackHeight(prev,prev.end,x)-prev.slope*gap-gap*(longGap?.02:.11):0;
 return{index,stage,serial,start,end:start+length,width,x,y,slope,bankStart,bankEnd,gap,jumpGap:longGap};
}
export function trackObstacles(t,rng){
 if(t.index<2||t.end-t.start<12||t.stage===2&&t.serial===0)return[];
 const side=rng()>.5?1:-1,items=[];
 for(let j=0;j<(t.index>7&&t.index%4===0?2:1);j++){
  const z=t.start+(t.end-t.start)*(j?.73:.48),x=t.x+side*t.width*(.18+rng()*.06);
  const kind=t.stage===2&&t.serial%2===0?'mallow':'mushroom';
  const width=kind==='mallow'?1.65:1.45,height=kind==='mallow'?.65:1.15,depth=kind==='mallow'?1.05:1.35;
  // The collision body bounds the whole decorative object, including the cap.
  const y=trackHeight(t,z,x);
  items.push({kind,x,y,z,width,height,depth});
 }
 return items;
}
