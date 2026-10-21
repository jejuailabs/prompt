// Pure rules for 번개 냥이 반응속도: stage plans, tap classification, scoring and the record proof.
// The host server re-checks the same proof (src/lib/reaction-record.ts), so keep the two in sync.
export const RANKING_KEY='reaction-total';
export const MIN_HUMAN_MS=100;   // faster than this is a guess, not a reaction
export const MISS_MS=1000;       // no tap before the timeout records this value
export const PENALTY_MS=20;      // added to the total for every false start
export const MAX_FALSE_STARTS=30;
export const SCORE_BASE=100000000; // time rankings store SCORE_BASE - ms so a higher score is faster

export const STAGES=Object.freeze([
 Object.freeze({id:1,name:'낮잠 냥이',tag:'기본',trials:3,wait:[1500,3800],decoys:[0,0],chain:false,timeout:1000,breed:0,coat:0,
  hint:'초록색으로 바뀌고 냥이가 깨어나면 바로 터치!'}),
 Object.freeze({id:2,name:'장난꾸러기 냥이',tag:'가짜 신호 · 색 함정',trials:3,wait:[2200,4600],decoys:[1,2],chain:false,timeout:1000,breed:3,coat:0,
  hint:'초록 + 번개만 진짜예요. 노랑·하늘·청록 신호와 물고기는 속임수!'}),
 Object.freeze({id:3,name:'번개 냥이',tag:'짧고 불규칙한 연속 반응',trials:5,wait:[550,2100],decoys:[0,1],chain:true,timeout:900,breed:6,coat:0,
  hint:'다섯 번 연속! 대기가 짧고 들쭉날쭉해요. 속임수도 섞여요.'})
]);
export const TOTAL_TRIALS=STAGES.reduce((n,s)=>n+s.trials,0);
export const DECOY_KINDS=Object.freeze(['yellow','sky','teal','fish']);

export function random(seed=Date.now()){let n=Number(seed)>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const between=(rand,[a,b])=>a+(b-a)*rand();

/** One trial: how long the cat dozes before the real signal, and when the decoys flash. */
export function planTrial(stage,rand=Math.random){
 const wait=Math.round(between(rand,stage.wait)),count=Math.floor(between(rand,[stage.decoys[0],stage.decoys[1]+.999])),decoys=[];
 const first=Math.max(350,wait*.22),last=wait-420;
 for(let i=0;i<count&&last-first>200;i++){
  const at=Math.round(first+(last-first)*(count===1?.3+rand()*.6:(i+.15+rand()*.7)/count));
  if(decoys.every(d=>Math.abs(d.at-at)>=520))decoys.push({at,kind:DECOY_KINDS[Math.floor(rand()*DECOY_KINDS.length)%DECOY_KINDS.length]});
 }
 return {wait,decoys:decoys.sort((a,b)=>a.at-b.at)};
}

/** A tap is a reaction only after the real signal and no faster than a human can respond. */
export function classifyTap(phase,elapsedMs){
 if(phase!=='go')return 'early';
 if(!Number.isFinite(elapsedMs)||elapsedMs<MIN_HUMAN_MS)return 'early';
 return 'hit';
}
export const recordedMs=ms=>Math.max(MIN_HUMAN_MS,Math.min(MISS_MS,Math.round(ms)));
export const average=list=>list.length?Math.round(list.reduce((a,b)=>a+b,0)/list.length):0;

export function splitByStage(trials){let at=0;return STAGES.map(s=>{const part=trials.slice(at,at+s.trials);at+=s.trials;return part;});}

/** Final record: the mean of the three stage averages plus the false-start penalty. */
export function summarize(trials,falseStarts=0){
 const stages=splitByStage(trials).map(average),fs=Math.max(0,Math.min(MAX_FALSE_STARTS,Math.floor(falseStarts)||0));
 const hits=trials.filter(t=>t<MISS_MS);
 const base=Math.round(stages.reduce((a,b)=>a+b,0)/STAGES.length);
 return {stages,best:hits.length?Math.min(...hits):MISS_MS,misses:trials.length-hits.length,falseStarts:fs,penalty:fs*PENALTY_MS,total:base+fs*PENALTY_MS};
}
export const encodeScore=total=>SCORE_BASE-total;
export const decodeScore=score=>SCORE_BASE-score;

/** The same checks the ranking server applies; a round that fails is kept on the device only. */
export function verifyProof({score,durationMs,trials,falseStarts}){
 if(!Array.isArray(trials)||trials.length!==TOTAL_TRIALS)return 'trials';
 if(!trials.every(t=>Number.isSafeInteger(t)&&t>=MIN_HUMAN_MS&&t<=MISS_MS))return 'range';
 if(!Number.isSafeInteger(falseStarts)||falseStarts<0||falseStarts>MAX_FALSE_STARTS)return 'false-starts';
 const hits=trials.filter(t=>t<MISS_MS);
 if(hits.length>=4&&Math.max(...hits)-Math.min(...hits)<4)return 'robotic';
 if(trials.filter(t=>t<130).length>3)return 'too-fast';
 const minWait=STAGES.reduce((n,s)=>n+s.trials*s.wait[0],0);
 if(!Number.isSafeInteger(durationMs)||durationMs<minWait)return 'duration';
 if(score!==encodeScore(summarize(trials,falseStarts).total))return 'score';
 return '';
}

export function grade(total){
 if(total<=230)return {id:'lightning',title:'번개 냥이',emoji:'⚡',line:'눈 깜짝할 새! 전설의 앞발이에요.'};
 if(total<=290)return {id:'swift',title:'날쌘 냥이',emoji:'🐾',line:'사냥 본능이 살아 있어요.'};
 if(total<=360)return {id:'clever',title:'똘똘 냥이',emoji:'✨',line:'차분하고 정확한 반응이에요.'};
 if(total<=460)return {id:'easy',title:'느긋 냥이',emoji:'🍀',line:'조금만 더 집중하면 금방 빨라져요.'};
 return {id:'nap',title:'낮잠 냥이',emoji:'💤',line:'냥이가 아직 졸려요. 한 번 더!'};
}
/** Face for a single reaction result. */
export const moodFor=ms=>ms>=MISS_MS?'normal':ms<=240?'laugh':ms<=320?'cheer':ms<=420?'wink':'normal';
