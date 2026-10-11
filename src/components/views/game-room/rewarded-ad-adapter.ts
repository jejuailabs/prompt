export type AdResult = 'rewarded' | 'dismissed' | 'unavailable' | 'failed';
export type RewardedAdRequest = {gameId:string;roundId:string;requestId:string;placement:'continue';signal:AbortSignal};
export interface RewardedAdAdapter { isAvailable:()=>boolean; show:(request:RewardedAdRequest)=>Promise<AdResult> }
declare global { interface Window { playlabRewardedAds?:RewardedAdAdapter } }
/** The publisher supplies its approved SDK adapter; availability never fabricates a view. */
export function rewardedAdAdapter(){return typeof window==='undefined'?undefined:window.playlabRewardedAds;}

export type AdBreakOptions={type:'reward';name:string;beforeReward:(show:()=>void)=>void;adViewed:()=>void;adDismissed:()=>void;adBreakDone:()=>void};
/** Inject the SDK function from its supported page context after publisher setup. */
export function createAdBreakRewardedAdapter(adBreak:(options:AdBreakOptions)=>void,ready:()=>boolean):RewardedAdAdapter{
 return{isAvailable:ready,show:request=>new Promise(resolve=>{
  if(!ready()||request.signal.aborted){resolve('unavailable');return;}
  let viewed=false,dismissed=false,settled=false;
  const finish=(result:AdResult)=>{if(settled)return;settled=true;request.signal.removeEventListener('abort',abort);resolve(result);};
  const abort=()=>finish('failed');request.signal.addEventListener('abort',abort,{once:true});
  try{adBreak({type:'reward',name:'continue-'+request.gameId,beforeReward:show=>{if(!request.signal.aborted)show();},adViewed:()=>{viewed=true;},adDismissed:()=>{dismissed=true;},adBreakDone:()=>finish(viewed?'rewarded':dismissed?'dismissed':'unavailable')});}catch{finish('failed');}
 })};
}
