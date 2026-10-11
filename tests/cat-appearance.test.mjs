import test from 'node:test';
import assert from 'node:assert/strict';
import {BREEDS,BASIC_COATS,catAppearance,availableAppearances,createAppearancePicker} from '../scripts/cat-module-kit/breeds.mjs';
import {createCat,catSummary,setCatMood,disposeCats} from '../public/games/prism-stack/cats.mjs';
import {disposeObject} from '../public/games/prism-stack/scene.mjs';

function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
test('opening four cats have four different coats for every tested seed',()=>{
 for(let seed=0;seed<100;seed++){const picker=createAppearancePicker(seeded(seed)),opening=[1,2,3,4].map(f=>picker.pick(f));assert.equal(new Set(opening.map(a=>a.coatId)).size,4);assert.ok(opening.every(a=>a.breedIndex===0));picker.reset();assert.equal(new Set([1,2,3,4].map(f=>picker.pick(f).coatId)).size,4);}
 assert.equal(new Set(BASIC_COATS.map(c=>c.color)).size,4);
});
test('each new breed debuts at its milestone while older cats stay eligible',()=>{
 for(const b of BREEDS.slice(1)){assert.ok(!availableAppearances(b.from-1).some(a=>a.breedIndex===b.index));assert.ok(availableAppearances(b.from).some(a=>a.breedIndex===b.index));assert.equal(createAppearancePicker(seeded(9)).pick(b.from).breedIndex,b.index);}
 assert.equal(availableAppearances(30).length,10);assert.equal(availableAppearances(4).length,4);
});
test('mixed bags retain basic cats at high floors and avoid consecutive identical appearances',()=>{
 for(let seed=0;seed<100;seed++){const picker=createAppearancePicker(seeded(seed));let last='';for(let floor=1;floor<=40;floor++){const a=picker.pick(floor);assert.ok(BREEDS[a.breedIndex].from<=floor);assert.notEqual(a.key,last);last=a.key;}
 const later=Array.from({length:30},()=>picker.pick(80));assert.equal(new Set(later.map(a=>a.key)).size,10);assert.ok(later.some(a=>a.breedIndex===0));}
});
test('coat models keep separate colors and preserve appearance for trimmed cats and offcuts',()=>{
 const data={x:0,z:0,width:4.2,depth:4.2},cats=BASIC_COATS.map(c=>createCat(data,2,0,{breedIndex:0,coatIndex:c.index}));
 assert.equal(new Set(cats.map(c=>c.children[0].material.color.getHex())).size,4);
 for(const cat of cats){const before=catSummary(cat),appearance=cat.userData.appearance,trimmed=createCat({...data,width:2},2,0,appearance),cut=createCat({...data,width:.3},2,0,{...appearance,fragment:true});setCatMood(trimmed,'laugh');assert.equal(catSummary(trimmed).coatId,before.coatId);assert.equal(trimmed.children[0].material.color.getHex(),cat.children[0].material.color.getHex());assert.equal(cut.children[0].material.color.getHex(),cat.children[0].material.color.getHex());assert.equal(catSummary(cut),null);assert.equal(catSummary(cat).mood,'normal');disposeObject(trimmed);disposeObject(cut);disposeObject(cat);}
 assert.equal(catAppearance(2,3).coatIndex,0);disposeCats();
});
