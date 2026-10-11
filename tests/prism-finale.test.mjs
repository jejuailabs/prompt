import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinale,stepFinale,LANDING_Y} from '../public/games/prism-stack/finale.mjs';
import {createCat,celebrateCat,animateCat,catSummary,CAT_MOODS,disposeCats} from '../public/games/prism-stack/cats.mjs';
import {disposeObject} from '../public/games/prism-stack/scene.mjs';
const origins=height=>Array.from({length:height+2},(_,i)=>({x:0,y:.63+i*1.02,z:0}));
function finish(finale){for(let i=0;i<3000&&!finale.done;i++)stepFinale(finale,1/120);assert.equal(finale.done,true);return finale.age;}
test('every stacked cat reaches the ground, bounces once and stays finite',()=>{const f=createFinale(origins(24));finish(f);assert.equal(f.actors.length,26);for(const a of f.actors){assert.equal(a.position.y,LANDING_Y);assert.equal(a.landed,true);assert.equal(a.bounces,1);assert.ok(Object.values(a.position).every(Number.isFinite));assert.equal(a.squash,0);}const before=structuredClone(f);stepFinale(f,1);assert.deepEqual(f,before);});
test('a higher tower gives a longer dive from its actual height',()=>{const low=createFinale(origins(1)),high=createFinale(origins(25));assert.ok(high.actors.at(-1).origin.y>low.actors.at(-1).origin.y);assert.ok(finish(high)>finish(low)+1.2);});
test('reduced motion still lands every cat with no tumble',()=>{const f=createFinale(origins(8),{reducedMotion:true});stepFinale(f,.5);for(const a of f.actors)assert.deepEqual(a.rotation,{x:0,y:0,z:0});finish(f);for(const a of f.actors)assert.deepEqual(a.rotation,{x:0,y:0,z:0});});
test('each cat cheers with a distinct face and cycles through happy expressions',()=>{const cats=CAT_MOODS.map((mood,i)=>{const c=createCat({x:0,z:0,width:4.2,depth:4.2},i,0);celebrateCat(c,i);assert.equal(catSummary(c).mood,mood);assert.equal(catSummary(c).earHeightScale,1);assert.equal(catSummary(c).celebrating,true);return c;});const faces=cats.map(c=>c.userData.cat.eyes.geometry);animateCat(cats[0],.9,1);assert.equal(catSummary(cats[0]).mood,'laugh');assert.notEqual(cats[0].userData.cat.eyes.geometry,faces[0]);assert.ok(cats[0].userData.cat.paws.every(p=>p.position.y>0));for(const c of cats)disposeObject(c);disposeCats();});
