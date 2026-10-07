'use client';
import { useEffect,useState } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { AI_EVENTS, EVENT_KINDS, eventStatus, filterEvents, type AiEvent, type EventKind } from './catalogue';
import { EventPoster } from './event-poster';
import styles from './events.module.css';
export default function AiEventsView() {
  const navigate=useAppStore(s=>s.navigate),params=useAppStore(s=>s.params);
  const [kind,setKind]=useState<EventKind|''>(''),[query,setQuery]=useState(''),[hideClosed,setHideClosed]=useState(false);
  // A shared instant keeps status badges consistent while browsing, including KST midnight.
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const refresh=()=>setNow(new Date());window.addEventListener('focus',refresh);const timer=setInterval(refresh,60000);return()=>{window.removeEventListener('focus',refresh);clearInterval(timer);};},[]);
  const selected=AI_EVENTS.find(item=>item.id===params.id),items=filterEvents(AI_EVENTS,{kind,query,hideClosed},now);
  if(selected) return <div className={styles.page}><button className={styles.back} onClick={()=>navigate('ai-events')}><ArrowLeft size={16}/>AI 일정 목록</button><div className={styles.detail}>
    <div className={styles.detailPoster}><EventPoster item={selected} now={now}/></div>
    <section className={styles.detailCopy}><span className={styles.eyebrow}>PLAYLAB / {EVENT_KINDS[selected.kind]}</span><h1>{selected.title}</h1><span className={styles.status} data-status={eventStatus(selected,now).code}>{eventStatus(selected,now).label}</span><p className={styles.description}>{selected.summary}</p>
    {selected.sourceNote&&<p className={styles.sourceNote}>{selected.sourceNote}</p>}
    <dl>{[['주최 · 운영',selected.organizer],['일정',selected.schedule],['접수',selected.application],['참가 대상',selected.audience],['장소 · 방식',selected.location],['비용',selected.cost]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className={styles.tags}>{selected.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
    <a className={styles.sourceLink} href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">주최측 원문 보기 <ArrowUpRight size={18}/></a><p className={styles.verified}>안내 확인 {selected.verifiedAt.replaceAll('-','.')} · 신청과 세부 조건은 주최측 원문에서 확인하세요.</p></section>
    </div><a className={styles.academyLink} href="/app#academy">지금 바로 배울 영상 강의도 둘러보세요 <ArrowUpRight size={16}/></a></div>;
  return <div className={styles.page}>
    <header className={styles.hero}><div><span className={styles.eyebrow}>PLAYLAB / LEARN. CONNECT. CHALLENGE.</span><h1>다음 배움,<br/><em>다음 도전.</em></h1><p>AI 강의·공모전·행사를 한눈에.<br/>마음에 드는 포스터에서 나의 다음 기회를 찾아보세요.</p></div><div className={styles.heroMark} aria-hidden="true"><span>AI</span><CalendarDays/><small>YOUR NEXT OPPORTUNITY</small></div></header>
    {params.id&&!selected&&<p role="alert" className={styles.sourceNote}>이 일정을 찾을 수 없어요. 아래 목록에서 다시 선택해주세요.</p>}
    <div className={styles.collectionHead}><div><span className={styles.eyebrow}>THE AI NOTICEBOARD</span><h2>배우고, 만나고, 도전하고. <small>{AI_EVENTS.length}</small></h2></div><label className={styles.search}><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="AI 일정 검색" placeholder="주제, 행사명, 주최측 검색"/></label></div>
    <div className={styles.controls}><div className={styles.filters} role="group" aria-label="일정 종류"><button aria-pressed={!kind} onClick={()=>setKind('')}>전체</button>{(Object.entries(EVENT_KINDS) as [EventKind,string][]).map(([id,label])=><button key={id} aria-pressed={kind===id} onClick={()=>setKind(id)}>{label}</button>)}</div><label className={styles.hideClosed}><input type="checkbox" checked={hideClosed} onChange={e=>setHideClosed(e.target.checked)}/>마감 제외</label></div>
    <p className={styles.result} role="status">{items.length}개 일정 · 가까운 일정부터 표시</p>
    <div className={styles.grid}>{items.map(item=><article key={item.id} className={styles.card}><button className={styles.posterButton} aria-label={item.title+' 자세히 보기'} onClick={()=>navigate('ai-events',{id:item.id})}><EventPoster item={item} now={now}/></button><div className={styles.cardInfo}><span className={styles.status} data-status={eventStatus(item,now).code}>{eventStatus(item,now).label}</span><h3><button onClick={()=>navigate('ai-events',{id:item.id})}>{item.title}</button></h3><p><CalendarDays size={13}/>{item.registrationClosed?'주최측 접수 마감 안내':item.applyUntil?'접수 ~ '+item.applyUntil.replaceAll('-','.'):item.schedule}</p><p><MapPin size={13}/>{item.location}</p></div></article>)}</div>
    {!items.length&&<div className={styles.empty}><h3>검색 조건에 맞는 일정이 없어요.</h3><button onClick={()=>{setKind('');setQuery('');setHideClosed(false);}}>전체 일정 보기</button></div>}
    <footer className={styles.boardFoot}><p>주최측 공식 안내를 확인해 정리한 일정입니다.<br/><span>내용 확인 2026.10.07 · 포스터를 눌러 참가 대상과 원문을 확인하세요.</span></p><a href="/app#academy">PLAYLAB 영상 강의 <ArrowUpRight size={16}/></a></footer>
  </div>;
}
