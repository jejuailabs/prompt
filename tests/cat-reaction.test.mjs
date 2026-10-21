import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {STAGES,TOTAL_TRIALS,RANKING_KEY,planTrial,classifyTap,recordedMs,summarize,encodeScore,decodeScore,verifyProof,random,MISS_MS} from '../public/games/cat-reaction/rules.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
function loadTs(file){const exports={},js=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{exports,require,Date});return exports;}
const server=loadTs('src/lib/reaction-record.ts'),modes=loadTs('src/lib/game-ranking-modes.ts');
const human=(seed)=>{const r=random(seed);return Array.from({length:TOTAL_TRIALS},()=>Math.round(190+r()*160));};
const minDuration=STAGES.reduce((n,s)=>n+s.trials*s.wait[0],0);

test('three stages get harder: decoys only from stage 2, stage 3 is a five-tap chain with short waits',()=>{
 assert.deepEqual(STAGES.map(s=>s.trials),[3,3,5]);assert.equal(TOTAL_TRIALS,11);
 assert.equal(STAGES[2].chain,true);assert.ok(STAGES[2].wait[0]<STAGES[0].wait[0]&&STAGES[2].timeout<STAGES[0].timeout);
 const rand=random(42);let stage2Decoys=0;
 for(let i=0;i<400;i++){
  const one=planTrial(STAGES[0],rand);assert.equal(one.decoys.length,0);assert.ok(one.wait>=1500&&one.wait<=3800);
  const two=planTrial(STAGES[1],rand);stage2Decoys+=two.decoys.length;assert.ok(two.decoys.length>=1&&two.decoys.length<=2);
  const three=planTrial(STAGES[2],rand);assert.ok(three.wait>=550&&three.wait<=2100&&three.decoys.length<=1);
  for(const plan of[two,three]){for(const d of plan.decoys)assert.ok(d.at>=300&&d.at<=plan.wait-420,'decoys end before the real signal');
   for(let k=1;k<plan.decoys.length;k++)assert.ok(plan.decoys[k].at-plan.decoys[k-1].at>=520);}
 }
 assert.ok(stage2Decoys>=400);
});
test('taps before the signal, on a decoy, or under 100ms are false starts; misses record 1000ms',()=>{
 assert.equal(classifyTap('wait',500),'early');assert.equal(classifyTap('decoy',500),'early');
 assert.equal(classifyTap('go',99),'early');assert.equal(classifyTap('go',100),'hit');assert.equal(classifyTap('go',NaN),'early');
 assert.equal(recordedMs(4000),MISS_MS);assert.equal(recordedMs(241.6),242);
});
test('the total is the mean of the three stage averages plus 20ms per false start',()=>{
 const trials=[200,220,240, 300,300,300, 250,250,250,250,250];
 const r=summarize(trials,2);assert.deepEqual(r.stages,[220,300,250]);assert.equal(r.total,257+40);assert.equal(r.best,200);assert.equal(r.misses,0);
 assert.equal(decodeScore(encodeScore(r.total)),r.total);assert.ok(encodeScore(250)>encodeScore(300),'faster ranks higher');
});
test('server proof check matches the game and rejects tampered or robotic rounds',()=>{
 for(let seed=1;seed<60;seed++){
  const trials=human(seed),fs=seed%3,score=encodeScore(summarize(trials,fs).total),durationMs=minDuration+5000;
  assert.equal(verifyProof({score,durationMs,trials,falseStarts:fs}),'');
  assert.equal(server.reactionProofProblem(score,durationMs,{trials,falseStarts:fs}),'');
  assert.equal(server.reactionTotal(trials,fs),summarize(trials,fs).total);
 }
 const trials=human(7),score=encodeScore(summarize(trials,0).total),ok={trials,falseStarts:0};
 const cases=[[score+1,minDuration,ok,'score'],[score,minDuration-1,ok,'duration'],[score,minDuration,{trials:trials.slice(1),falseStarts:0},'trials'],
  [score,minDuration,{trials:[99,...trials.slice(1)],falseStarts:0},'range'],[score,minDuration,{trials,falseStarts:-1},'false-starts'],[score,minDuration,null,'proof']];
 for(const [s,d,p,why]of cases){assert.equal(server.reactionProofProblem(s,d,p),why);if(p)assert.equal(verifyProof({score:s,durationMs:d,...p}),why);}
 const robot=Array(11).fill(180);assert.equal(server.reactionProofProblem(encodeScore(summarize(robot,0).total),minDuration,{trials:robot,falseStarts:0}),'robotic');
 const quick=[105,110,115,120,250,260,270,280,290,300,310];assert.equal(server.reactionProofProblem(encodeScore(summarize(quick,0).total),minDuration,{trials:quick,falseStarts:0}),'too-fast');
});
test('ranking mode formats reaction records in ms and stays out of cross-game point lists',()=>{
 const list=modes.rankingModes('cat-reaction');assert.equal(list.length,1);assert.equal(list[0].key,RANKING_KEY);assert.equal(list[0].unit,'ms');
 assert.equal(modes.validRankingKey('cat-reaction',RANKING_KEY),RANKING_KEY);assert.throws(()=>modes.validRankingKey('cat-reaction','beginner'));
 assert.throws(()=>modes.validRankingKey('cat-sling',RANKING_KEY));
 assert.equal(modes.rankingSlug('builtin-cat-reaction','/games/cat-reaction/index.html'),'cat-reaction');
 assert.deepEqual({...modes.formatRankingValue(list[0],encodeScore(287))},{value:'287',unit:'ms'});
 assert.deepEqual({...modes.formatRankingValue(modes.rankingModes('minesweeper')[0],100000000-12340)},{value:'12.34',unit:'초'});
 assert.ok(modes.TIME_RANKING_KEYS.includes(RANKING_KEY));
});
test('portable package lists every file, uses relative URLs and is registered in the game room',()=>{
 const dir='public/games/cat-reaction/',m=JSON.parse(readFileSync(dir+'game.manifest.json','utf8'));
 assert.equal(m.id,'cat-reaction');assert.equal(m.entry,'index.html');assert.equal(m.requirements.externalNetwork,false);
 for(const f of m.files)assert.ok(existsSync(dir+f),f);
 for(const f of m.files.filter(f=>/\.(mjs|css|html)$/.test(f))){const src=readFileSync(dir+f,'utf8');assert.doesNotMatch(src,/["'(]\/(games|app|api)\//,f+' has no host-absolute path');assert.doesNotMatch(src,/https?:\/\/(?!www\.w3\.org)/,f+' loads nothing remote');}
 const registry=readFileSync('src/lib/portable-games.generated.ts','utf8');assert.match(registry,/"slug": "cat-reaction"/);assert.match(registry,/"contentUrl": "\/games\/cat-reaction\/index.html"/);
});
