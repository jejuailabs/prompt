import type { CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { EVENT_KINDS, eventCountdown, type AiEvent } from './catalogue';
import styles from './events.module.css';
function Motif({kind}:{kind:AiEvent['motif']}) {
  if(kind==='award') return <svg viewBox="0 0 240 150"><path d="M91 24h58v25c0 27-14 36-29 36S91 76 91 49zM120 85v23m-27 13h54M89 32H70c0 29 15 38 29 38m52-38h19c0 29-15 38-29 38" /><circle cx="120" cy="53" r="13"/><path d="m113 53 5 5 10-11M59 97l-4 10-10 4 10 4 4 10 4-10 10-4-10-4zM179 9l-3 8-8 3 8 3 3 8 3-8 8-3-8-3z" /></svg>;
  if(kind==='code') return <svg viewBox="0 0 240 150"><rect x="31" y="20" width="178" height="107" rx="10"/><path d="M31 44h178m-93 72h58M59 33h1m10 0h1m10 0h1m-6 27-16 18 16 18m88-36 16 18-16 18m-33-39-20 47"/><circle cx="192" cy="111" r="25"/><path d="m192 97 3 11 11 3-11 3-3 11-3-11-11-3 11-3z"/></svg>;
  if(kind==='chat') return <svg viewBox="0 0 240 150"><path d="M24 18h156v74H77l-29 22V92H24zM80 98v19h91l35 24v-24h13V58h-34"/><path d="M46 42h109M46 56h77M46 70h91"/><circle cx="163" cy="89" r="20"/><path d="m155 89 6 6 11-13"/></svg>;
  if(kind==='learning') return <svg viewBox="0 0 240 150"><path d="M32 119V45h176v74M21 45l19-27h160l19 27M43 70h58v35H43m89 13V70h42v48"/><path d="M23 45v8c0 19 24 19 24 0 0 19 24 19 24 0 0 19 24 19 24 0 0 19 24 19 24 0 0 19 24 19 24 0 0 19 24 19 24 0 0 19 24 19 24 0 0 19 24 19 24 0v-8"/><path d="m113 81 4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/></svg>;
  const nodes=kind==='network'?[[120,20],[51,50],[189,50],[64,122],[176,122],[120,81]]:[[120,20],[47,99],[193,99],[120,79]];
  return <svg viewBox="0 0 240 150">{nodes.slice(0,-1).map(([x,y],i)=><path key={i} d={`M${x} ${y}L120 ${kind==='network'?81:79}`}/>)}{nodes.map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r={i===nodes.length-1?24:17}/>{i===nodes.length-1&&<path d={`M${x-8} ${y}h16m-8-8v16`}/>}</g>)}</svg>;
}
export function EventPoster({item,now}:{item:AiEvent;now:Date}) {
  const longest=Math.max(1,...item.posterLines.map(line=>Array.from(line).reduce((sum,char)=>sum+(/[\u0000-\u007f]/.test(char)?.6:1),0)));
  const palette={'--accent':item.accent,'--surface':item.surface,'--title-font':Math.min(13,80/longest)+'cqi'} as CSSProperties;
  if(item.posterUrl) return <div className={styles.posterImage} style={palette} aria-hidden="true"><img src={item.posterUrl} alt="" /></div>;
  return <div className={styles.poster} style={palette} aria-hidden="true">
    <div className={styles.posterTop}><span>{EVENT_KINDS[item.kind]}</span><b>{eventCountdown(item,now)}</b></div>
    <div className={styles.posterTitle}>{item.posterLines.map((line,i)=><span key={i}>{line}</span>)}</div>
    <p className={styles.posterSubtitle}>{item.subtitle}</p>
    <div className={styles.motif}><Motif kind={item.motif}/></div>
    <div className={styles.posterBottom}><span>{item.organizer}</span><ArrowUpRight size={18}/></div>
  </div>;
}
