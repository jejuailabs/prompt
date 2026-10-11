export type RankingMode={key:string;label:string;time?:boolean};
export const kstDay=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
export function rankingSlug(id:string,contentUrl?:string|null){for(const slug of ['minesweeper','hidden-paws','velvet-21','code-ball'])if(contentUrl?.split('?')[0]==='/games/'+slug+'.html'||contentUrl?.split('?')[0]==='/games/'+slug+'/index.html')return slug;return id.replace(/^builtin-/,'');}
const alphabetLabels:Record<string,string>={number:'숫자',alpha:'문자 후보',full:'A~Z'};
export function rankingModes(slug:string):RankingMode[]{
 if(slug==='minesweeper')return[{key:'beginner',label:'초급',time:true},{key:'intermediate',label:'중급',time:true},{key:'expert',label:'고급',time:true},{key:'legacy',label:'이전 기록'}];
 if(slug==='hidden-paws')return[{key:'journey',label:'15마리 여행'},{key:'legacy',label:'이전 기록'}];
 if(slug==='velvet-21')return[{key:'target',label:'3,000칩 달성'},{key:'bankrupt',label:'딜러 파산'}];
 if(slug==='code-ball')return ['number','alpha','full'].flatMap(a=>[{key:'arcade-'+a+'-ladder',label:alphabetLabels[a]+' 3→6'},...['3','4','5','6'].map(n=>({key:'arcade-'+a+'-'+n,label:alphabetLabels[a]+' '+n+'자리'})),{key:'daily-'+kstDay()+'-'+a,label:'오늘 · '+alphabetLabels[a]}]);
 return [];
}
export function validRankingKey(slug:string,value:unknown){if(value===undefined||value==='')return '';if(typeof value!=='string'||value.length>64)throw new Error('올바른 랭킹 모드가 아닙니다.');if(slug==='code-ball'){const match=value.match(/^daily-(\d{4}-\d{2}-\d{2})-(number|alpha|full)$/);if(match&&match[1]<=kstDay()){const date=new Date(match[1]);if(!Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===match[1])return value;}}if(rankingModes(slug).some(m=>m.key===value&&value!=='legacy'))return value;throw new Error('이 게임에서 지원하지 않는 랭킹 모드입니다.');}
export const rankingPrefix=(key:string)=>'rank-'+key+'-';
export const rankingTime=(score:number)=>(100000000-score)/1000;
