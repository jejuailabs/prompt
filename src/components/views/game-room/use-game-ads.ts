'use client';
import {useEffect,useState,type RefObject} from 'react';
import {rewardedAdAdapter} from './rewarded-ad-adapter';
export function useGameAds({iframeRef,slug,enabled}:{iframeRef:RefObject<HTMLIFrameElement|null>;slug?:string;enabled:boolean}){
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  if(!enabled||!slug)return;
  let active:AbortController|null=null,disposed=false,timer:ReturnType<typeof setTimeout>|undefined;const used=new Set<string>();
  const send=(data:Record<string,unknown>)=>iframeRef.current?.contentWindow?.postMessage({gameId:slug,contractVersion:1,...data},location.origin);
  const available=()=>{try{return rewardedAdAdapter()?.isAvailable()===true;}catch{return false;}};
  const advertise=()=>send({type:'game-ad-capabilities',rewardedContinue:available()});
  const listen=async(e:MessageEvent)=>{
   if(e.source!==iframeRef.current?.contentWindow||e.origin!==location.origin)return;
   const m=e.data;if(m?.gameId!==slug||m?.contractVersion!==1)return;
   if(m.type==='game-ready'||m.type==='game-ad-ready'){advertise();return;}
   if(m.type!=='game-continue-request'||typeof m.roundId!=='string'||typeof m.requestId!=='string')return;
   const key=m.roundId;if(active||used.has(key)||!available()){send({type:'game-reward-result',roundId:m.roundId,requestId:m.requestId,result:'unavailable'});return;}
   const controller=new AbortController();active=controller;setBusy(true);timer=setTimeout(()=>{controller.abort();active=null;setBusy(false);send({type:'game-reward-result',roundId:m.roundId,requestId:m.requestId,result:'failed'});},90000);let result='failed';
   try{result=await rewardedAdAdapter()!.show({gameId:slug,roundId:m.roundId,requestId:m.requestId,placement:'continue',signal:controller.signal});if(!['rewarded','dismissed','unavailable','failed'].includes(result))result='failed';}catch{result='failed';}
   if(disposed||controller.signal.aborted)return;clearTimeout(timer);
   if(result==='rewarded')used.add(key);active=null;setBusy(false);send({type:'game-reward-result',roundId:m.roundId,requestId:m.requestId,result});
  };
  window.addEventListener('message',listen);window.addEventListener('playlab-game-ads-ready',advertise);advertise();
  return()=>{disposed=true;clearTimeout(timer);active?.abort();window.removeEventListener('message',listen);window.removeEventListener('playlab-game-ads-ready',advertise);};
 },[iframeRef,slug,enabled]);
 return busy;
}
