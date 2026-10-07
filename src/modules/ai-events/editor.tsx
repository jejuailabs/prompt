'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ImagePlus, Loader2, Plus, Upload, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { useRuntime } from '@/components/runtime-context';
import { EVENT_KINDS, type AiEvent } from './catalogue';
import { eventInputSchema, eventToInput, inputToEvent, POSTER_THEMES, type EventInput } from './input';
import { EventPoster } from './event-poster';
import styles from './events.module.css';
const EMPTY:EventInput={kind:'course',title:'',subtitle:'',organizer:'',summary:'',schedule:'',application:'',audience:'',location:'',cost:'',sourceUrl:'',posterText:'',theme:'sage',tags:'',applyFrom:'',applyUntil:'',applyTime:'',startsAt:'',endsAt:'',registrationClosed:false,removePoster:false};
export function EventEditor({item}:{item?:AiEvent}) {
  const navigate=useAppStore(s=>s.navigate),session=useAppStore(s=>s.session),requireLogin=useAppStore(s=>s.requireLogin);
  const {previewMode}=useRuntime(),client=useQueryClient();
  const [input,setInput]=useState<EventInput>(()=>item?eventToInput(item):{...EMPTY});
  const [file,setFile]=useState<File|null>(null),[localUrl,setLocalUrl]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const set=(key:keyof EventInput,value:string|boolean)=>setInput(previous=>({...previous,[key]:value}));
  useEffect(()=>()=>{if(localUrl)URL.revokeObjectURL(localUrl);},[localUrl]);
  const pick=(candidate?:File)=>{
    if(!candidate) return;
    if(!['image/png','image/jpeg','image/webp'].includes(candidate.type)||candidate.size>3*1024*1024||candidate.size===0) {setError('PNG·JPG·WebP 이미지, 3MB 이하로 선택해주세요.');return;}
    setFile(candidate);setLocalUrl(URL.createObjectURL(candidate));set('removePoster',false);setError('');
  };
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(previewMode) return;
    if(!requireLogin()) return;
    if(session?.role!=='admin') {setError('관리자만 일정을 등록·수정할 수 있습니다.');return;}
    const parsed=eventInputSchema.safeParse(input);if(!parsed.success){setError(parsed.error.issues[0]?.message??'입력 내용을 확인해주세요.');return;}
    setSaving(true);setError('');
    try {
      const form=new FormData();form.set('data',JSON.stringify(parsed.data));if(file)form.set('poster',file);
      const response=await fetch(item?'/api/ai-events/'+encodeURIComponent(item.id):'/api/ai-events',{method:item?'PUT':'POST',body:form});
      const result=await response.json();if(!response.ok||!result.ok||!result.data)throw new Error(result.error??'일정을 저장하지 못했습니다.');
      await client.invalidateQueries({queryKey:['ai-events']});
      navigate('ai-events',{id:result.data.id,...(result.data.published===false?{manage:'1'}:{})});
    } catch(caught) {setError(caught instanceof Error?caught.message:'저장에 실패했습니다. 입력 내용은 유지됩니다.');} finally {setSaving(false);}
  }
  if(!previewMode&&session?.role!=='admin') return <div className={styles.page}><button className={styles.back} onClick={()=>navigate('ai-events')}><ArrowLeft size={16}/>AI 일정 목록</button><div className={styles.empty}><h1>관리자 전용 일정 등록</h1><p>관리자로 로그인하면 포스터와 일정 정보를 올릴 수 있습니다.</p>{!session&&<button onClick={()=>requireLogin()}>관리자 로그인</button>}</div></div>;
  const poster=inputToEvent({...input,title:input.title||'새로운 AI 일정',organizer:input.organizer||'주최 · 운영',subtitle:input.subtitle||'나의 다음 배움과 도전'},item?.id??'preview');
  poster.posterUrl=localUrl||(!input.removePoster?item?.posterUrl:undefined);
  const field=(key:keyof EventInput,label:string,placeholder='',required=false,type='text')=><label className={styles.field}>{label}{required&&<span> *</span>}<input name={key} type={type} value={String(input[key])} onChange={e=>set(key,e.target.value)} placeholder={placeholder} required={required} maxLength={key==='sourceUrl'?2000:key==='title'?100:200} disabled={saving}/></label>;
  return <div className={styles.page}>
    <button className={styles.back} disabled={saving} onClick={()=>navigate('ai-events',item?{id:item.id,...(item.published===false?{manage:'1'}:{})}:{})}><ArrowLeft size={16}/>{item?'일정 상세로':'AI 일정 목록'}</button>
    <header className={styles.editorHead}><span className={styles.eyebrow}>PLAYLAB / AI NOTICEBOARD</span><h1>{item?'일정 수정':'새 일정 등록'}</h1><p>포스터와 정보를 올리면 AI 일정 메뉴에 표시됩니다.</p></header>
    {previewMode&&<p role="status" className={styles.sourceNote}>등록 화면 미리보기입니다. 입력·이미지 선택은 가능하며, 저장은 운영 사이트의 관리자 계정에서 할 수 있습니다.</p>}
    <form onSubmit={submit} className={styles.editor}>
      <div className={styles.formFields}>
        <fieldset disabled={saving}><legend>기본 정보</legend><div className={styles.fieldRow}><label className={styles.field}>분류 *<select name="kind" value={input.kind} onChange={e=>set('kind',e.target.value)}>{Object.entries(EVENT_KINDS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>{field('organizer','주최 · 운영','기관 또는 주최자 이름',true)}</div>
        {field('title','제목','강의·공모전·행사 이름',true)}{field('subtitle','한 줄 소개','어떤 기회인지 짧게 소개해주세요')}
        <label className={styles.field}>상세 소개 *<textarea name="summary" value={input.summary} onChange={e=>set('summary',e.target.value)} placeholder="내용, 프로그램, 참가 방법 등을 적어주세요" required maxLength={6000} rows={5}/></label>
        {field('sourceUrl','신청 · 안내 링크','https://',true,'url')}</fieldset>
        <fieldset disabled={saving}><legend>일정과 참가 안내</legend>{field('schedule','일정 안내','예: 10월 14일 19:30–21:30 / 지역별 상이',true)}{field('application','접수 안내','예: 10월 12일까지 접수 / 상시 신청')}<div className={styles.fieldRow}>{field('audience','참가 대상','누가 참여할 수 있나요?')}{field('location','장소 · 방식','온라인 Zoom / 서울 코엑스')}</div>{field('cost','비용','무료 / 참가비 / 원문 확인')}
        <details className={styles.dateDetails}><summary>마감 표시와 일정 날짜 설정</summary><p>입력한 날짜를 기준으로 D-day와 진행·마감 상태를 표시합니다. 날짜가 확정되지 않았다면 비워두세요. 시간은 한국시간 기준입니다.</p><div className={styles.fieldRow}>{field('applyFrom','접수 시작일','',false, 'date')}{field('applyUntil','접수 마감일','',false, 'date')}</div>{field('applyTime','접수 마감 시간','',false, 'time')}<div className={styles.fieldRow}>{field('startsAt','일정 시작','',false, 'datetime-local')}{field('endsAt','일정 종료','',false, 'datetime-local')}</div></details>
        <label className={styles.closedCheck}><input type="checkbox" checked={input.registrationClosed} onChange={e=>set('registrationClosed',e.target.checked)}/>접수 마감으로 표시 (조기 마감 포함)</label></fieldset>
        <fieldset disabled={saving}><legend>포스터</legend><p className={styles.fieldHint}>이미지를 올리거나, 제목으로 만든 포스터를 사용하세요.</p>
        <label className={styles.uploadArea}><ImagePlus size={23}/><strong>{file?file.name:poster.posterUrl?'포스터 이미지 교체':'포스터 이미지 선택'}</strong><span>PNG · JPG · WebP / 3MB 이하</span><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="포스터 이미지" onChange={e=>{pick(e.target.files?.[0]);e.target.value='';}}/></label>
        {poster.posterUrl&&<button type="button" className={styles.removeImage} onClick={()=>{setFile(null);setLocalUrl('');set('removePoster',true);}}><X size={14}/>이미지 제거 · 제목 포스터 사용</button>}
        {!poster.posterUrl&&<><label className={styles.field}>포스터 문구<textarea name="posterText" value={input.posterText} onChange={e=>set('posterText',e.target.value)} placeholder="비워두면 제목으로 자동 생성합니다.\n한 줄 30자 이내, 최대 4줄" rows={4} maxLength={140}/></label><div className={styles.themeOptions} role="group" aria-label="포스터 색상">{Object.entries(POSTER_THEMES).map(([key,theme])=><button type="button" key={key} aria-pressed={input.theme===key} onClick={()=>set('theme',key)} style={{borderColor:theme.accent,color:theme.accent}}>{theme.label}</button>)}</div></>}
        {field('tags','태그','예: 바이브코딩, 입문, 온라인')}</fieldset>
        {error&&<p className={styles.formError} role="alert">{error}</p>}
        <div className={styles.formActions}><button type="button" disabled={saving} onClick={()=>navigate('ai-events')}>취소</button><button type="submit" className={styles.registerButton} disabled={saving||previewMode}>{saving?<Loader2 className={styles.spin} size={16}/>:item?<Upload size={16}/>:<Plus size={16}/>} {saving?'저장 중…':item?'수정 내용 저장':'일정 등록'}</button></div>
      </div>
      <aside className={styles.editorPreview}><span className={styles.eyebrow}>POSTER PREVIEW</span><div className={styles.detailPoster}><EventPoster item={poster} now={new Date()}/></div><h2>{input.title||'새로운 AI 일정'}</h2><p>{input.schedule||'일정 안내가 여기에 표시됩니다.'}</p><p>이미지는 전체가 보이도록 표시합니다.</p></aside>
    </form>
  </div>;
}
