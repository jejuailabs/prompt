const {chromium,options}=require('./browser.cjs');const fs=require('node:fs');const assert=require('node:assert/strict');
let browser;
(async()=>{browser=await chromium.launch(options());const page=await browser.newPage({viewport:{width:960,height:720},deviceScaleFactor:1});const errors=[],badRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4175/relocated/'))badRequests.push(r.url());});
 for(const id of['prism-stack','neon-slope','pocket-crossing']){
  await page.goto(`http://127.0.0.1:4175/relocated/${id}/?qa=1&seed=421`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.gameModule&&document.querySelector('.boot').hidden);await page.evaluate(()=>window.gameModule.start());
  if(id==='prism-stack'){
   const result=await page.evaluate(()=>{const m=window.gameModule;for(let floor=0;floor<8;floor++){let s,placed=false;for(let i=0;i<2000;i++){m.advance(1/60,false);s=m.snapshot();if(s.cooldown===0&&Math.abs(s.moving[s.axis]-s.top[s.axis])<.04){document.querySelector('[data-drop]').click();placed=true;break;}}if(!placed)throw new Error('Tower could not align');}m.advance(.35);return m.snapshot();});assert.equal(result.height,8);assert.ok(result.streak>=3);console.log('TOWER eight alternating perfect placements '+JSON.stringify(result));
  }
  if(id==='neon-slope'){
   await page.evaluate(()=>window.gameModule.advance(.8));await page.keyboard.down('ArrowRight');const before=await page.evaluate(()=>window.gameModule.snapshot());await page.evaluate(()=>window.gameModule.advance(.25));await page.keyboard.up('ArrowRight');const after=await page.evaluate(()=>window.gameModule.snapshot());assert.ok(after.ball.x>before.ball.x+.5);await page.keyboard.down('ArrowLeft');await page.evaluate(()=>window.gameModule.advance(.24));await page.keyboard.up('ArrowLeft');await page.evaluate(()=>window.gameModule.advance(.6));console.log('SLOPE key steering and acceleration '+JSON.stringify(await page.evaluate(()=>window.gameModule.snapshot())));
  }
  if(id==='pocket-crossing'){
   const result=await page.evaluate(()=>{const m=window.gameModule;function move(dx,dz){document.querySelector(`[data-move="${dx},${dz}"]`).click();m.advance(.2,false);}function clearNext(s){const lane=s.lanes.find(r=>r.index===Math.round(s.player.z)+1);if(!lane)return false;if(lane.type==='road')return lane.actors.every(a=>Math.abs(a.x+a.speed*.15-s.player.x)>a.width/2+.65);if(lane.type==='river')return lane.actors.some(a=>Math.abs(a.x+a.speed*.17-s.player.x)<a.width/2-.35);if(lane.type==='rail')return !lane.train.visible&&!lane.train.warning;return !lane.blocked.some(x=>Math.abs(x-s.player.x)<.7);}
    for(let target=1;target<=6;target++){let good=false;for(let i=0;i<300;i++){let s=m.snapshot();if(s.state!=='running'||s.dead)throw new Error('Crossing bot died at '+s.player.z);if(clearNext(s)){move(0,1);good=true;break;}m.advance(.03,false);}if(!good)throw new Error('No safe crossing');}
    m.advance(.02);return m.snapshot();});assert.equal(result.furthest,6);assert.equal(result.dead,0);console.log('CROSSING roads and both moving rivers '+JSON.stringify(result));
  }
  await page.screenshot({path:`public/games/${id}/cover.png`});await page.screenshot({path:`tmp/game-qa/${id}-polished.png`});
  await page.setViewportSize({width:390,height:780});await page.evaluate(()=>window.gameModule.advance(.01));await page.screenshot({path:`tmp/game-qa/${id}-polished-mobile.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.evaluate(()=>window.gameModule.pause());const paused=await page.evaluate(()=>window.gameModule.snapshot());await page.evaluate(()=>window.gameModule.advance(2));assert.equal((await page.evaluate(()=>window.gameModule.snapshot())).elapsed,paused.elapsed);
  await page.setViewportSize({width:960,height:720});await page.evaluate(()=>window.gameModule.restart());const restarted=await page.evaluate(()=>window.gameModule.snapshot());assert.equal(restarted.score,0);assert.equal(restarted.state,'running');
  if(id==='prism-stack'){await page.evaluate(()=>{window.gameModule.advance(.25,false);document.querySelector('[data-drop]').click();window.gameModule.advance(1);});assert.equal((await page.evaluate(()=>window.gameModule.snapshot())).state,'finished');}
  if(id==='neon-slope'){await page.keyboard.down('ArrowRight');await page.evaluate(()=>window.gameModule.advance(5));await page.keyboard.up('ArrowRight');assert.equal((await page.evaluate(()=>window.gameModule.snapshot())).state,'finished');}
  if(id==='pocket-crossing'){await page.evaluate(()=>window.gameModule.advance(10));assert.equal((await page.evaluate(()=>window.gameModule.snapshot())).state,'finished');}
  await page.evaluate(()=>window.gameModule.dispose());assert.equal((await page.evaluate(()=>window.gameModule.snapshot())).state,'disposed');console.log(id+' mobile, pause, restart, fail and dispose PASS');
 }
 console.log(JSON.stringify({errors,badRequests}));assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});