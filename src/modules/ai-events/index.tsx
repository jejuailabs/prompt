'use client';
import { useEffect,useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, CalendarDays, Eye, EyeOff, Loader2, MapPin, Pencil, Plus, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useRuntime } from '@/components/runtime-context';
import { api } from '@/lib/api-client';
import { EVENT_KINDS, eventStatus, filterEvents, type AiEvent, type EventKind } from './catalogue';
import { EventPoster } from './event-poster';
import { EventEditor } from './editor';
import styles from './events.module.css';
export default function AiEventsView() {
  const navigate=useAppStore(s=>s.navigate),params=useAppStore(s=>s.params),session=useAppStore(s=>s.session),requireLogin=useAppStore(s=>s.requireLogin);
  const {previewMode}=useRuntime(),client=useQueryClient(),admin=session?.role==='admin',canPreview=admin||previewMode;
  const [kind,setKind]=useState<EventKind|''>(''),[query,setQuery]=useState(''),[hideClosed,setHideClosed]=useState(false),[notice,setNotice]=useState(''),[saving,setSaving]=useState(false);
  const managing=(params.manage==='1'||Boolean(params.edit))&&canPreview;
  const scope=managing?'manage':'public';
  const library=useQuery({queryKey:['ai-events',scope,session?.id],queryFn:()=>api.get<AiEvent[]>('/api/ai-events'+(managing?'?scope=manage':''))});
  const records=library.data??[];
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const refresh=()=>setNow(new Date());window.addEventListener('focus',refresh);const timer=setInterval(refresh,60000);return()=>{window.removeEventListener('focus',refresh);clearInterval(timer);};},[]);
  const selected=records.find(item=>item.id===(params.edit||params.id)),items=filterEvents(records,{kind,query,hideClosed},now);
  const register=()=>{if(canPreview)navigate('ai-events',{new:'1'});else if(!session)requireLogin();else setNotice('관리자만 일정을 등록·수정할 수 있습니다.');};
  async function setPublished(item:AiEvent) {
    if(previewMode){setNotice('미리보기에서는 공개 상태를 변경하지 않습니다.');return;}
    setSaving(true);setNotice('');
    try {await api.patch('/api/ai-events/'+encodeURIComponent(item.id),{published:item.published===false});await client.invalidateQueries({queryKey:['ai-events']});navigate('ai-events',{manage:'1'});}
    catch(error){setNotice(error instanceof Error?error.message:'공개 상태 변경에 실패했습니다.');}finally{setSaving(false);}
  }
  if(params.new==='1')return <EventEditor key="new"/>;
  if(params.edit&&selected)return <EventEditor key={selected.id} item={selected}/>;
  if((params.edit||params.id)&&library.isPending&&!selected)return <div className={styles.page}><p role="status">일정을 불러오는 중입니다.</p></div>;
  const loadError=library.isError?<p className={styles.sourceNote} role="alert">등록된 일정을 불러오지 못했습니다. <button onClick={()=>library.refetch()}>다시 불러오기</button></p>:null;
  if(selected) return <div className={styles.page}><button className={styles.back} onClick={()=>navigate('ai-events',managing?{manage:'1'}:{})}><ArrowLeft size={16}/>AI 일정 목록</button>{loadError}{notice&&<p role="alert" className={styles.sourceNote}>{notice}</p>}<div className={styles.detail}>
    <div className={styles.detailPoster}><EventPoster item={selected} now={now}/></div>
    <section className={styles.detailCopy}><span className={styles.eyebrow}>PLAYLAB / {EVENT_KINDS[selected.kind]}</span><h1>{selected.title}</h1><span className={styles.status} data-status={eventStatus(selected,now).code}>{selected.published===false?'목록에서 숨김':eventStatus(selected,now).label}</span>
    {canPreview&&<div className={styles.detailActions}><button onClick={()=>navigate('ai-events',{edit:selected.id,manage:'1'})}><Pencil size={14}/>일정 수정</button><button disabled={saving} onClick={()=>setPublished(selected)}>{saving?<Loader2 size={14}/>:selected.published===false?<Eye size={14}/>:<EyeOff size={14}/>} {selected.published===false?'다시 공개':'목록에서 숨기기'}</button></div>}
    <p className={styles.description}>{selected.summary}</p>{selected.sourceNote&&<p className={styles.sourceNote}>{selected.sourceNote}</p>}
    <dl>{[['주최 · 운영',selected.organizer],['일정',selected.schedule],['접수',selected.application],['참가 대상',selected.audience],['장소 · 방식',selected.location],['비용',selected.cost]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className={styles.tags}>{selected.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
    <a className={styles.sourceLink} href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">신청 · 안내 원문 보기 <ArrowUpRight size={18}/></a><p className={styles.verified}>{selected.origin==='admin'?'관리자 등록':'안내 확인'} {selected.verifiedAt.replaceAll('-','.')} · 신청과 세부 조건은 주최측 원문에서 확인하세요.</p></section>
    </div><a className={styles.academyLink} href="/app#academy">지금 바로 배울 영상 강의도 둘러보세요 <ArrowUpRight size={16}/></a></div>;
  return <div className={styles.page}>
    <header className={styles.hero}><div><span className={styles.eyebrow}>PLAYLAB / LEARN. CONNECT. CHALLENGE.</span><h1>다음 배움,<br/><em>다음 도전.</em></h1><p>AI 강의·공모전·행사를 한눈에.<br/>마음에 드는 포스터에서 나의 다음 기회를 찾아보세요.</p><button className={styles.registerButton} onClick={register}><Plus size={16}/>일정 등록</button><span className={styles.adminHint}>관리자 전용</span></div><div className={styles.heroMark} aria-hidden="true"><span>AI</span><CalendarDays/><small>YOUR NEXT OPPORTUNITY</small></div></header>
    {loadError}{notice&&<p role="alert" className={styles.sourceNote}>{notice}</p>}
    {(params.id||params.edit)&&!selected&&<p role="alert" className={styles.sourceNote}>이 일정을 찾을 수 없어요. 아래 목록에서 다시 선택해주세요.</p>}
    <div className={styles.collectionHead}><div><span className={styles.eyebrow}>THE AI NOTICEBOARD</span><h2>{managing?'일정 관리':'배우고, 만나고, 도전하고.'} <small>{records.length}</small></h2></div><label className={styles.search}><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="AI 일정 검색" placeholder="주제, 행사명, 주최측 검색"/></label></div>
    {canPreview&&<div className={styles.managementNav}><button aria-pressed={!managing} onClick={()=>navigate('ai-events')}>공개 일정</button><button aria-pressed={managing} onClick={()=>navigate('ai-events',{manage:'1'})}>일정 관리 · 숨김 포함</button></div>}
    <div className={styles.controls}><div className={styles.filters} role="group" aria-label="일정 종류"><button aria-pressed={!kind} onClick={()=>setKind('')}>전체</button>{(Object.entries(EVENT_KINDS) as [EventKind,string][]).map(([id,label])=><button key={id} aria-pressed={kind===id} onClick={()=>setKind(id)}>{label}</button>)}</div><label className={styles.hideClosed}><input type="checkbox" checked={hideClosed} onChange={e=>setHideClosed(e.target.checked)}/>마감 제외</label></div>
    <p className={styles.result} role="status">{items.length}개 일정 · 가까운 일정부터 표시{library.isFetching?' · 불러오는 중':''}</p>
    <div className={styles.grid}>{items.map(item=><article key={item.id} className={styles.card}><button className={styles.posterButton} aria-label={item.title+' 자세히 보기'} onClick={()=>navigate('ai-events',{id:item.id,...(managing?{manage:'1'}:{})})}><EventPoster item={item} now={now}/></button><div className={styles.cardInfo}><span className={styles.status} data-status={eventStatus(item,now).code}>{item.published===false?'목록에서 숨김':eventStatus(item,now).label}</span><h3><button onClick={()=>navigate('ai-events',{id:item.id,...(managing?{manage:'1'}:{})})}>{item.title}</button></h3><p><CalendarDays size={13}/>{item.registrationClosed?'주최측 접수 마감 안내':item.applyUntil?'접수 ~ '+item.applyUntil.replaceAll('-','.'):item.schedule}</p><p><MapPin size={13}/>{item.location}</p>{canPreview&&<button className={styles.cardEdit} aria-label={item.title+' 수정'} onClick={()=>navigate('ai-events',{edit:item.id,manage:'1'})}><Pencil size={12}/>수정</button>}</div></article>)}</div>
    {library.isPending&&<p className={styles.result} role="status">일정을 불러오는 중입니다.</p>}
    {!items.length&&!library.isPending&&!library.isError&&<div className={styles.empty}><h3>검색 조건에 맞는 일정이 없어요.</h3><button onClick={()=>{setKind('');setQuery('');setHideClosed(false);}}>전체 일정 보기</button></div>}
    <footer className={styles.boardFoot}><p>관리자가 등록한 AI 강의·공모전·행사 안내입니다.<br/><span>포스터를 눌러 참가 대상과 신청·안내 원문을 확인하세요.</span></p><a href="/app#academy">PLAYLAB 영상 강의 <ArrowUpRight size={16}/></a></footer>
  </div>;
}
