export type RankingMode={key:string;label:string;time?:boolean;unit?:'ms';note?:string};
export const kstDay=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
export function rankingSlug(id:string,contentUrl?:string|null){for(const slug of ['minesweeper','hidden-paws','velvet-21','code-ball','cat-reaction'])if(contentUrl?.split('?')[0]==='/games/'+slug+'.html'||contentUrl?.split('?')[0]==='/games/'+slug+'/index.html')return slug;return id.replace(/^builtin-/,'');}
const alphabetLabels:Record<string,string>={number:'숫자',alpha:'문자 후보',full:'A~Z'};
export function rankingModes(slug:string):RankingMode[]{
 if(slug==='minesweeper')return[{key:'beginner',label:'초급',time:true},{key:'intermediate',label:'중급',time:true},{key:'expert',label:'고급',time:true},{key:'legacy',label:'이전 기록'}];
 if(slug==='cat-reaction')return[{key:'reaction-total',label:'3단계 종합',time:true,unit:'ms',note:'3단계 평균 반응속도(ms)가 가장 빠른 기록으로 경쟁합니다.'}];
 if(slug==='hidden-paws')return[{key:'journey',label:'15마리 여행'},{key:'legacy',label:'이전 기록'}];
 if(slug==='velvet-21')return[{key:'target',label:'3,000칩 달성'},{key:'bankrupt',label:'딜러 파산'}];
 if(slug==='code-ball')return ['number','alpha','full'].flatMap(a=>[{key:'arcade-'+a+'-ladder',label:alphabetLabels[a]+' 3→6'},...['3','4','5','6'].map(n=>({key:'arcade-'+a+'-'+n,label:alphabetLabels[a]+' '+n+'자리'})),{key:'daily-'+kstDay()+'-'+a,label:'오늘 · '+alphabetLabels[a]}]);
 return [];
}
export function validRankingKey(slug:string,value:unknown){if(value===undefined||value==='')return '';if(typeof value!=='string'||value.length>64)throw new Error('올바른 랭킹 모드가 아닙니다.');if(slug==='code-ball'){const match=value.match(/^daily-(\d{4}-\d{2}-\d{2})-(number|alpha|full)$/);if(match&&match[1]<=kstDay()){const date=new Date(match[1]);if(!Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===match[1])return value;}}if(rankingModes(slug).some(m=>m.key===value&&value!=='legacy'))return value;throw new Error('이 게임에서 지원하지 않는 랭킹 모드입니다.');}
export const rankingPrefix=(key:string)=>'rank-'+key+'-';
export const rankingTime=(score:number)=>(100000000-score)/1000;
/** Time-encoded scores (100000000 - ms) never mix with point totals in cross-game lists. */
export const TIME_RANKING_KEYS=['beginner','intermediate','expert','reaction-total'] as const;
export function formatRankingValue(mode:RankingMode|undefined,score:number){if(!mode?.time)return{value:score.toLocaleString(),unit:'점'};const ms=100000000-score;return mode.unit==='ms'?{value:ms.toLocaleString(),unit:'ms'}:{value:(ms/1000).toFixed(2),unit:'초'};}
