const {chromium,options}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path');
let browser;
(async()=>{
 browser=await chromium.launch(options());
 const page=await browser.newPage({viewport:{width:1100,height:820},deviceScaleFactor:1});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 fs.mkdirSync('tmp/game-qa',{recursive:true});
 for(const id of['prism-stack','neon-slope','pocket-crossing']){
  await page.goto('http://127.0.0.1:4175/relocated/'+id+'/?qa=1&seed=421',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.gameModule&&document.querySelector('.boot').hidden,{timeout:45000});
  await page.waitForTimeout(700);
  console.log(id+' READY '+JSON.stringify(await page.evaluate(()=>window.gameModule.snapshot())));
  await page.screenshot({path:'tmp/game-qa/'+id+'-desktop.png'});
  await page.evaluate(()=>window.gameModule.start());await page.waitForTimeout(1200);
  console.log(id+' RUN '+JSON.stringify(await page.evaluate(()=>window.gameModule.snapshot())));
  await page.evaluate(()=>window.gameModule.pause());const before=await page.evaluate(()=>window.gameModule.snapshot());await page.waitForTimeout(300);const after=await page.evaluate(()=>window.gameModule.snapshot());if(before.elapsed!==after.elapsed)throw new Error(id+' moved during pause');
  await page.evaluate(()=>window.gameModule.restart());await page.waitForTimeout(100);
  const reset=await page.evaluate(()=>window.gameModule.snapshot());if(reset.state!=='running'||reset.score!==0)throw new Error(id+' restart failed '+JSON.stringify(reset));
  await page.screenshot({path:'tmp/game-qa/'+id+'-play.png'});
  await page.setViewportSize({width:390,height:780});await page.waitForTimeout(300);await page.screenshot({path:'tmp/game-qa/'+id+'-mobile.png'});await page.setViewportSize({width:1100,height:820});
 }
 console.log(JSON.stringify({errors,externalRequests:requests.filter(url=>!url.startsWith('http://127.0.0.1:4175/')),originalPathRequests:requests.filter(url=>url.includes('/games/')||url.includes('/api/'))},null,2));
 await browser.close();if(errors.length)process.exitCode=1;
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});