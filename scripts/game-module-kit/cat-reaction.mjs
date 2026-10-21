// Real-browser QA for the portable 번개 냥이 반응속도 package, served from a different sub-path (/relocated/).
// Usage: node scripts/game-module-kit/serve.cjs public 4175  (separately), then node scripts/game-module-kit/cat-reaction.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium,options}=createRequire(import.meta.url)('./browser.cjs');
const out=process.argv[2]||'exports/qa/cat-reaction';fs.mkdirSync(out,{recursive:true});
const URL_BASE='http://127.0.0.1:4175/relocated/cat-reaction/';
async function play(page,label,{touch=false}={}){
 const errors=[],badRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4175/relocated/'))badRequests.push(r.url());});
 await page.goto(URL_BASE+'?qa=1&seed=7',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.gameModule&&window.gameModule.snapshot().phase==='intro'&&window.gameModule.snapshot().cat);
 await page.waitForTimeout(400);await page.screenshot({path:path.join(out,label+'-1-intro.png')});
 const snap=()=>page.evaluate(()=>window.gameModule.snapshot());
 const box=await page.locator('[data-card]').boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height*.35;
 const press=async()=>{if(touch)await page.touchscreen.tap(cx,cy);else await page.mouse.click(cx,cy);};
 await page.click('[data-go]');
 const shots=new Set(),reactions=[];let falseStartDone=false,decoySeen=false,guard=0;
 while(guard++<4000){
  const s=await snap();
  if(s.phase==='result')break;
  if(s.phase==='stage-intro'){if(!shots.has('stage'+s.stage)){shots.add('stage'+s.stage);await page.screenshot({path:path.join(out,label+'-stage'+s.stage+'-intro.png')});}await page.click('[data-go]');continue;}
  if(s.phase==='wait'&&!shots.has('wait')){shots.add('wait');await page.waitForTimeout(250);await page.screenshot({path:path.join(out,label+'-2-wait.png')});continue;}
  if(s.phase==='wait'&&!falseStartDone&&s.stage===1&&s.trialInStage===1){falseStartDone=true;await press();await page.waitForTimeout(120);if(!shots.has('early')){shots.add('early');await page.screenshot({path:path.join(out,label+'-4-early.png')});}continue;}
  if(s.phase==='decoy'){decoySeen=true;if(!shots.has('decoy-'+s.decoy)){shots.add('decoy-'+s.decoy);await page.screenshot({path:path.join(out,label+'-decoy-'+s.decoy+'.png')});}continue;}
  if(s.phase==='go'){const t0=Date.now();await press();reactions.push(Date.now()-t0);if(!shots.has('go')){shots.add('go');}
   continue;}
  await page.waitForTimeout(15);
 }
 // The go frame itself: force one more look by replaying is not needed; capture from a dedicated pass below.
 const final=await snap();await page.waitForTimeout(700);await page.screenshot({path:path.join(out,label+'-6-result.png')});
 assert.equal(final.phase,'result');assert.equal(final.trials.length,final.totalTrials);assert.ok(final.falseStarts>=1,'a false start was recorded');assert.ok(final.result.total>0);
 assert.equal(final.submitted,null,'qa/preview never submits');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,'no horizontal overflow');
 assert.deepEqual(badRequests,[]);assert.deepEqual(errors,[]);
 console.log(label,JSON.stringify({trials:final.trials,falseStarts:final.falseStarts,total:final.result.total,stages:final.result.stages,decoySeen,best:final.best}));
 return final;
}
async function goShot(page,label,{touch=false}={}){
 // Capture the green "지금!" frame and a pause/resume cycle.
 await page.goto(URL_BASE+'?qa=1&slowmo=1&seed=11',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.gameModule?.snapshot().phase==='intro'&&window.gameModule.snapshot().cat);
 await page.click('[data-go]');await page.click('[data-go]');
 await page.waitForFunction(()=>window.gameModule.snapshot().phase==='go',null,{timeout:8000,polling:5});await page.waitForTimeout(40);
 await page.screenshot({path:path.join(out,label+'-3-go.png')});
 const box=await page.locator('[data-card]').boundingBox();if(touch)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height*.35);else await page.mouse.click(box.x+box.width/2,box.y+box.height*.35);
 await page.waitForFunction(()=>window.gameModule.snapshot().phase==='hit',null,{timeout:3000});await page.waitForTimeout(250);await page.screenshot({path:path.join(out,label+'-5-hit.png')});
 await page.waitForFunction(()=>window.gameModule.snapshot().phase==='wait'||window.gameModule.snapshot().phase==='ready',null,{timeout:5000});
 await page.evaluate(()=>window.gameModule.pause());let s=await page.evaluate(()=>window.gameModule.snapshot());assert.equal(s.paused,true);
 await page.evaluate(()=>window.gameModule.resume());s=await page.evaluate(()=>window.gameModule.snapshot());assert.equal(s.paused,false);
 // Synthetic (untrusted) clicks are ignored outside qa mode.
 await page.goto(URL_BASE+'?seed=3',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.gameModule?.snapshot().phase==='intro');await page.click('[data-go]');await page.click('[data-go]');
 await page.waitForFunction(()=>window.gameModule.snapshot().phase==='wait',null,{timeout:4000});
 await page.evaluate(()=>document.querySelector('[data-card]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0})));
 s=await page.evaluate(()=>window.gameModule.snapshot());assert.equal(s.falseStarts,0,'scripted pointer events do not count');
 await page.evaluate(()=>window.gameModule.dispose());
}
(async()=>{const browser=await chromium.launch(options());try{
 const desktop=await browser.newPage({viewport:{width:1100,height:760}});await play(desktop,'desktop');await goShot(desktop,'desktop');
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});const mobile=await ctx.newPage();await play(mobile,'mobile',{touch:true});await goShot(mobile,'mobile',{touch:true});
 console.log('cat-reaction QA passed →',out);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
