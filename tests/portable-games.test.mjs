import test from 'node:test';
import {makeRoundId} from '../scripts/game-module-kit/runtime.mjs';
import assert from 'node:assert/strict';
import {cutStack} from '../public/games/prism-stack/rules.mjs';
import {advanceBall,trackHeight,sphereBoxHit} from '../public/games/neon-slope/rules.mjs';
import {sweptHit,logUnder,crossingScore,laneType} from '../public/games/pocket-crossing/rules.mjs';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';

test('alternating tower cuts preserve the other axis and exactly partition the slab',()=>{
 let top={x:0,z:0,width:4,depth:4};
 for(const [axis,delta]of[['x',.8],['z',-.6],['x',-.4],['z',.3]]){
  const moving={...top,[axis]:top[axis]+delta},result=cutStack(top,moving,axis),dim=axis==='x'?'width':'depth',other=axis==='x'?'depth':'width';
  assert.equal(result.hit,true);assert.equal(result.perfect,false);assert.ok(Math.abs(result.next[dim]+result.cut[dim]-top[dim])<1e-10);assert.equal(result.next[other],top[other]);assert.equal(result.cut[other],top[other]);top=result.next;
 }
 assert.ok(top.width<4&&top.depth<4);
});
test('tower perfect stacks snap without shrinkage; an edge-only contact ends the round',()=>{
 const top={x:2,z:-1,width:.2,depth:1};assert.equal(cutStack(top,{...top,x:2.015},'x').perfect,true);assert.equal(cutStack(top,{...top,x:2.035},'x').perfect,false);assert.equal(cutStack(top,{...top,x:2.2},'x').hit,false);
});
test('a rolling ball crosses continuous downhill seams without bouncing or falling through',()=>{
 const tracks=[{start:0,end:12,x:0,width:8,y:0,slope:.15},{start:12,end:30,x:.5,width:7,y:-1.8,slope:.25}],b={x:0,y:.5,z:0,vx:0,vy:0,speed:24,radius:.5,grounded:true};
 for(let i=0;i<125;i++)assert.equal(advanceBall(b,tracks,[],0,1/120),null);const t=tracks.find(t=>b.z>=t.start&&b.z<=t.end);assert.ok(Math.abs(b.y-trackHeight(t,b.z)-.5)<1e-7);assert.equal(b.grounded,true);
});
test('a downhill gap launches the ball and lets it land on the lowered next platform',()=>{
 const tracks=[{start:0,end:8,x:0,width:8,y:0,slope:.15},{start:10,end:35,x:0,width:8,y:-1.2-.3-.22,slope:.15}],b={x:0,y:.5,z:0,vx:0,vy:0,speed:20,radius:.5,grounded:true};let airborne=false,landed=false;
 for(let i=0;i<150;i++){const failure=advanceBall(b,tracks,[],0,1/120);assert.equal(failure,null);if(!b.grounded)airborne=true;if(airborne&&b.grounded&&b.z>10)landed=true;}assert.equal(airborne,true);assert.equal(landed,true);
});
test('120Hz stepping detects a red obstacle at maximum game speed',()=>{
 const track={start:0,end:100,x:0,width:8,y:0,slope:.15},obstacle={x:0,y:-3,z:20,width:1.2,height:1.2,depth:1.2},b={x:0,y:.5,z:0,vx:0,vy:0,speed:39,radius:.5,grounded:true};let hit=false;
 for(let i=0;i<120;i++){if(advanceBall(b,[track],[obstacle],0,1/120)==='collision'){hit=true;break;}}assert.equal(hit,true);assert.equal(sphereBoxHit({x:3,y:-2,z:20},.5,obstacle),false);
});
test('leaving the side of a slope makes the ball fall rather than stay glued to the floor',()=>{
 const track={start:0,end:100,x:0,width:3,y:0,slope:.15},b={x:0,y:.5,z:0,vx:0,vy:0,speed:24,radius:.5,grounded:true};let failure=null;for(let i=0;i<400;i++){failure=advanceBall(b,[track],[],1,1/120);if(failure)break;}assert.equal(failure,'fall');assert.equal(b.grounded,false);
});
test('a fast train cannot tunnel through the character between physics frames',()=>{
 const train={previousX:-7,x:7,z:4,width:3,depth:.9};assert.equal(sweptHit({x:0,z:4},{x:0,z:4},train),true);assert.equal(sweptHit({x:0,z:2},{x:0,z:2},train),false);
});
test('crossing checks moving cars during a hop and supports only the usable part of a log',()=>{
 assert.equal(sweptHit({x:0,z:0},{x:0,z:1},{previousX:-.5,x:.5,z:1,width:1.4,depth:.75}),true);const log={x:1,width:3,speed:.8};assert.equal(logUnder([log],1),log);assert.equal(logUnder([log],2.6),null);
});
test('only the furthest row and collected coins determine crossing score',()=>{
 assert.equal(crossingScore(7,2),120);assert.equal(crossingScore(7,2),crossingScore(7,2));assert.deepEqual(Array.from({length:9},(_,i)=>laneType(i)),['grass','road','road','grass','river','river','grass','rail','grass']);
});
test('portable packages list local files, both engine chunks, thumbnails and host lifecycle',()=>{
 for(const id of['prism-stack','neon-slope','pocket-crossing']){const dir=path.resolve('public/games',id),m=JSON.parse(readFileSync(path.join(dir,'game.manifest.json'),'utf8'));assert.equal(m.id,id);assert.equal(m.requirements.server,false);assert.equal(m.requirements.externalNetwork,false);for(const file of m.files){assert.equal(file.startsWith('/'),false);assert.equal(file.includes('..'),false);assert.equal(existsSync(path.join(dir,file)),true,file);}assert.ok(m.files.includes('vendor/three.core.min.js'));assert.ok(m.files.includes('vendor/three.module.min.js'));assert.ok(m.contract.commands.includes('dispose'));assert.equal(existsSync(path.join(dir,m.thumbnail)),true);}
});
test('a module still creates valid round IDs on HTTP origins without randomUUID',()=>{const source={getRandomValues:bytes=>{for(let i=0;i<bytes.length;i++)bytes[i]=i*13;return bytes;}};assert.match(makeRoundId(source),/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);});
