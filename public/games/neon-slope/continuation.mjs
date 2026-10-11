import {makeRoundId} from './runtime.mjs';
// Optional rewarded continuation contract. The host owns its advertising SDK.
export function createContinuation(rt){let available=false,used=false,pending=null,revive=null,title='',detail='';
 const send=data=>{if(rt.parentOrigin&&window.parent!==window)window.parent.postMessage({gameId:rt.id,contractVersion:1,...data},rt.parentOrigin);};
 function finish(){pending=null;rt.primary.disabled=rt.secondary.disabled=false;rt.setState('running');rt.finish(title,detail);}
 function show(){rt.setState('continuable');rt.dialog(title,detail+'\n광고를 완료하면 생명 1개로 같은 판을 이어갑니다.','광고 보고 이어서',request);rt.secondary.textContent='이 기록으로 마무리';rt.secondary.hidden=false;rt.primary.disabled=rt.secondary.disabled=false;}
 function request(){if(pending||rt.state!=='continuable')return;if(!available){rt.toast('지금은 광고를 불러올 수 없어요. 기록을 마무리할 수 있습니다.');return;}pending={roundId:rt.roundId,requestId:makeRoundId()};rt.setState('ad-pending');rt.audio?.suspend().catch(()=>{});rt.primary.disabled=rt.secondary.disabled=true;rt.primary.textContent='광고 확인 중…';send({type:'game-continue-request',...pending});}
 rt.on(rt.secondary,'click',e=>{if(!['continuable','ad-pending'].includes(rt.state))return;e.preventDefault();e.stopImmediatePropagation();if(!pending)finish();},{capture:true});
 rt.on(window,'message',e=>{if(e.source!==window.parent||!rt.parentOrigin||e.origin!==rt.parentOrigin)return;const m=e.data;if(m?.gameId!==rt.id||m.contractVersion!==1)return;if(m.type==='game-command'&&m.command==='finalize'){if(['continuable','ad-pending'].includes(rt.state))finish();return;}if(m.type==='game-ad-capabilities'){available=m.rewardedContinue===true;return;}if(m.type!=='game-reward-result'||!pending||m.roundId!==pending.roundId||m.requestId!==pending.requestId||rt.roundId!==pending.roundId||rt.state!=='ad-pending')return;pending=null;
  if(m.result==='rewarded'&&!used){used=true;rt.primary.disabled=rt.secondary.disabled=false;rt.overlay.hidden=true;rt.secondary.hidden=true;rt.setState('running');rt.last=0;rt.audioUnlock();revive?.();rt.toast('생명 +1 · 같은 판에서 다시 데굴데굴!');}else{show();rt.toast(m.result==='dismissed'?'광고를 완료하지 않아 생명은 그대로예요.':'광고를 불러오지 못했어요. 기록을 마무리할 수 있습니다.');}});
 rt.on(window,'pagehide',()=>{if(['continuable','ad-pending'].includes(rt.state))finish();},{capture:true});
 queueMicrotask(()=>send({type:'game-ad-ready',rewardedContinue:true}));
 return{reset(){used=false;pending=null;revive=null;rt.primary.disabled=rt.secondary.disabled=false;},offer(reason,summary,onReward){if(!available||used||!rt.parentOrigin)return false;title=reason;detail=summary;revive=onReward;rt.hooks.clearInput?.();show();return true;},snapshot:()=>({available,used,pending:!!pending})};
}
