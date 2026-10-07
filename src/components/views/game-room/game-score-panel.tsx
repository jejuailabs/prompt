'use client';
import { useEffect,useRef,useState,type RefObject } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
type Round={score:number;roundId:string;durationMs:number};
type Ranking={rank:number;username:string;score:number;playedAt:string};
function restoreRound(slug?:string):Round|null{if(!slug||typeof window==='undefined')return null;try{const round=JSON.parse(localStorage.getItem('little-worlds:'+slug+':pending-score')??'null');return round&&Number.isSafeInteger(round.score)&&round.score>0&&typeof round.roundId==='string'?round:null;}catch{return null;}}
export function GameScorePanel({gameId,slug,iframeRef,previewMode,localGame}:{gameId:string;slug?:string;iframeRef:RefObject<HTMLIFrameElement|null>;previewMode:boolean;localGame:boolean}){
  const sessionId=useAppStore(s=>s.session?.id),requireLogin=useAppStore(s=>s.requireLogin),qc=useQueryClient();
  const [pending,setPending]=useState<Round|null>(()=>restoreRound(slug)),[status,setStatus]=useState<'idle'|'saved'|'error'>('idle'),[savedScore,setSavedScore]=useState(0),[retry,setRetry]=useState(0),[period,setPeriod]=useState('all');
  const sent=useRef('');
  const ranking=useQuery({queryKey:['leaderboard',gameId,period],queryFn:()=>api.get<{rankings:Ranking[]}>('/api/game-room/leaderboard?'+new URLSearchParams({gameId,period,limit:'10'})),enabled:!previewMode,refetchInterval:30000});
  useEffect(()=>{
    const listen=(event:MessageEvent)=>{
      if(event.source!==iframeRef.current?.contentWindow||(localGame&&event.origin!==window.location.origin))return;
      const data=event.data;if(data?.type!=='game-score'||!Number.isSafeInteger(data.score)||data.score<=0||data.score>100000000)return;
      const round={score:data.score,roundId:typeof data.roundId==='string'?data.roundId:crypto.randomUUID(),durationMs:typeof data.durationMs==='number'?Math.max(0,Math.min(86400000,Math.floor(data.durationMs))):0};
      setStatus('idle');setPending(round);
    };window.addEventListener('message',listen);return()=>window.removeEventListener('message',listen);
  },[iframeRef,localGame]);
  useEffect(()=>{
    if(!pending||!sessionId||previewMode)return;
    const key=pending.roundId+':'+retry;if(sent.current===key)return;sent.current=key;
    let mounted=true;
    api.post<{score:number}>('/api/game-room/play',{artifactId:gameId,...pending}).then(result=>{
      iframeRef.current?.contentWindow?.postMessage({type:'game-score-saved',roundId:pending.roundId,score:pending.score},localGame?window.location.origin:'*');
      if(slug){try{const stored=restoreRound(slug);if(stored?.roundId===pending.roundId)localStorage.removeItem('little-worlds:'+slug+':pending-score');}catch{}}
      void qc.invalidateQueries({queryKey:['leaderboard']});void qc.invalidateQueries({queryKey:['leaderboard-global']});void qc.invalidateQueries({queryKey:['game-room']});
      if(mounted){setSavedScore(result.score??pending.score);setStatus('saved');setPending(current=>current?.roundId===pending.roundId?null:current);}
    }).catch(()=>{if(mounted)setStatus('error');});return()=>{mounted=false;if(sent.current===key)sent.current='';};
  },[pending,sessionId,previewMode,gameId,iframeRef,localGame,slug,qc,retry]);
  return <Card className="mt-4 p-4 sm:p-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-amber-300"/>최고 기록 랭킹</h2><div className="flex flex-wrap gap-1">{Object.entries({all:'전체',today:'오늘',week:'이번 주',month:'이번 달'}).map(([id,label])=><button key={id} onClick={()=>setPeriod(id)} aria-pressed={period===id} className={'rounded-full border px-3 py-1 text-[11px] '+(period===id?'bg-primary text-primary-foreground border-primary':'border-border text-muted-foreground')}>{label}</button>)}</div></div>
    <p className="mb-3 text-[11px] text-muted-foreground">한 사람의 최고 점수만 순위에 표시됩니다.</p>
    <div role="status" className="mb-3 text-xs leading-6 text-amber-200/90">{previewMode?'미리보기 · 최고 점수는 이 기기에 저장됩니다.':status==='error'?<span>기록 저장에 실패했어요. {pending?.score.toLocaleString()}점은 보관 중입니다. <Button size="sm" variant="outline" onClick={()=>setRetry(n=>n+1)}>다시 등록</Button></span>:pending&&!sessionId?<span>이번 기록 <strong>{pending.score.toLocaleString()}점</strong> · <Button size="sm" variant="outline" onClick={()=>requireLogin()}>로그인하고 기록 등록</Button></span>:pending?'기록을 랭킹에 등록하는 중…':status==='saved'?savedScore.toLocaleString()+'점 기록을 저장했습니다.':!sessionId?<span>로그인하면 한 판의 점수를 숫자 랭킹에 남길 수 있어요. <button className="underline" onClick={()=>requireLogin()}>로그인</button></span>:null}</div>
    {previewMode?<p className="text-xs text-muted-foreground">운영 사이트에서 로그인 후 랭킹에 도전하세요.</p>:ranking.isError?<p role="alert" className="text-xs text-muted-foreground">랭킹을 불러오지 못했어요. <button className="underline" onClick={()=>ranking.refetch()}>다시 불러오기</button></p>:ranking.isPending?<p className="text-xs text-muted-foreground">기록을 불러오는 중…</p>:ranking.data?.rankings.length?<ol className="divide-y divide-border">{ranking.data.rankings.map(row=><li key={row.rank+'-'+row.username} className="flex items-center gap-3 py-3 text-sm"><span className="w-7 font-mono font-semibold tabular-nums text-amber-300">{row.rank}</span><span className="min-w-0 flex-1 truncate">{row.username}</span><strong className="font-mono font-medium tabular-nums">{row.score.toLocaleString()}<span className="ml-1 text-[10px] text-muted-foreground">점</span></strong></li>)}</ol>:<p className="py-2 text-xs text-muted-foreground">아직 기록이 없어요. 첫 번째 기록에 도전해보세요.</p>}
  </Card>;
}
