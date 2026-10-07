import { z } from 'zod';
import { koreaDate, type AiEvent } from './catalogue';

export const POSTER_THEMES = {
  sage: { label: '그린', accent: '#bbdbd1', surface: '#23433d' },
  sand: { label: '골드', accent: '#f4cc94', surface: '#4c372b' },
  coral: { label: '코랄', accent: '#edbba6', surface: '#4b2c28' },
  indigo: { label: '퍼플', accent: '#c2c5fb', surface: '#313b60' },
  blue: { label: '블루', accent: '#aecfef', surface: '#203954' },
};
const requiredText = (label: string, max: number) => z.string().trim().min(1, label+'을 입력해주세요.').max(max, label+'이 너무 깁니다.');
const optionalText = (max: number) => z.string().trim().max(max).optional().default('');
const calendarDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const date = z.string().refine(value=>!value||calendarDate(value),'올바른 날짜를 입력해주세요.').optional().default('');
const instant = z.string().refine(value=>!value||(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\+09:00)?$/.test(value)&&calendarDate(value.slice(0,10))&&Number(value.slice(11,13))<24&&Number(value.slice(14,16))<60&&(!value.slice(16).startsWith(':')||Number(value.slice(17,19))<60)),'올바른 일정 날짜와 시간을 입력해주세요.').optional().default('');
const sourceUrl = z.string().trim().max(2000).url('신청·안내 링크를 입력해주세요.').refine(value=>{ try { const u=new URL(value); return u.protocol==='https:'&&!u.username&&!u.password; } catch { return false; } },'https://로 시작하는 안내 링크를 입력해주세요.');
export const eventInputSchema = z.object({
  kind: z.enum(['course','contest','event']), title: requiredText('제목',100), subtitle: optionalText(180),
  organizer: requiredText('주최·운영',120), summary: requiredText('소개',6000),
  schedule: requiredText('일정 안내',180), application: optionalText(180), audience: optionalText(200), location: optionalText(200), cost: optionalText(200), sourceUrl,
  posterText: optionalText(140).refine(value=>!value|| (value.split('\n').length<=4&&value.split('\n').every(line=>line.trim().length>0&&Array.from(line.trim()).length<=30)),'포스터 문구는 한 줄 30자 이내, 최대 4줄로 입력해주세요.'),
  theme: z.enum(['sage','sand','coral','indigo','blue']).optional().default('sage'), tags: optionalText(200),
  applyFrom: date, applyUntil: date, applyTime: z.string().refine(value=>!value||/^([01]\d|2[0-3]):[0-5]\d$/.test(value),'올바른 마감 시간을 입력해주세요.').optional().default(''),
  startsAt: instant, endsAt: instant, registrationClosed: z.boolean().optional().default(false), removePoster: z.boolean().optional().default(false),
}).superRefine((value,ctx)=>{
  const invalid=(field: string,message: string)=>ctx.addIssue({code:'custom',path:[field],message});
  if(value.applyFrom&&value.applyUntil&&value.applyFrom>value.applyUntil) invalid('applyUntil','접수 마감일은 시작일 이후여야 합니다.');
  if(value.applyTime&&!value.applyUntil) invalid('applyUntil','마감 시간을 쓰려면 마감일도 입력해주세요.');
  if(value.endsAt&&!value.startsAt) invalid('startsAt','종료 시간을 쓰려면 시작 시간도 입력해주세요.');
  if(value.startsAt&&value.endsAt&&Date.parse(value.startsAt.endsWith('+09:00')?value.startsAt:value.startsAt+'+09:00')>=Date.parse(value.endsAt.endsWith('+09:00')?value.endsAt:value.endsAt+'+09:00')) invalid('endsAt','종료 시간은 시작 시간 이후여야 합니다.');
});
export type EventInput = z.infer<typeof eventInputSchema>;

/** Balance long titles without truncating the title stored in the detail view. */
export function titleLines(title: string) {
  const weight=(text:string)=>Array.from(text).reduce((sum,char)=>sum+(/[\u0000-\u007f]/.test(char)?.6:1),0);
  const words=title.trim().split(/\s+/).filter(Boolean);
  let target=Math.max(6,weight(title)/4+1);
  const wrap=()=>{
    const lines:string[]=[];let line='';
    for(const word of words) {
      if(line&&weight(line+' '+word)>target) {lines.push(line);line='';}
      if(weight(word)>target) {
        for(const char of Array.from(word)) {if(line&&weight(line+char)>target){lines.push(line);line='';}line+=char;}
      } else line+=(line?' ':'')+word;
    }
    if(line)lines.push(line);return lines;
  };
  let lines=wrap();while(lines.length>4){target+=1;lines=wrap();}return lines;
}
export function inputToEvent(input: EventInput,id: string,now=new Date()): AiEvent {
  const palette=POSTER_THEMES[input.theme];
  const kst=(value: string)=>value?(value.endsWith('+09:00')?value:value+'+09:00'):undefined;
  return {id,kind:input.kind,title:input.title,subtitle:input.subtitle,posterLines:input.posterText?input.posterText.split('\n').map(line=>line.trim()):titleLines(input.title),
    organizer:input.organizer,summary:input.summary,schedule:input.schedule,application:input.application||'접수 조건은 주최측 안내에서 확인',
    audience:input.audience||'주최측 안내 확인',location:input.location||'주최측 안내 확인',cost:input.cost||'주최측 안내 확인',sourceUrl:input.sourceUrl,
    verifiedAt:koreaDate(now),tags:[...new Set(input.tags.split(',').map(tag=>tag.trim()).filter(Boolean))].slice(0,10),...palette,
    motif:input.kind==='contest'?'award':input.kind==='event'?'network':'learning',
    applyFrom:input.applyFrom||undefined,applyUntil:input.applyUntil||undefined,applyTime:input.applyTime||undefined,startsAt:kst(input.startsAt),endsAt:kst(input.endsAt),registrationClosed:input.registrationClosed,origin:'admin'};
}

export function eventToInput(item: AiEvent): EventInput {
  const theme=(Object.keys(POSTER_THEMES) as (keyof typeof POSTER_THEMES)[]).find(key=>POSTER_THEMES[key].accent===item.accent)??'sage';
  return {kind:item.kind,title:item.title,subtitle:item.subtitle,organizer:item.organizer,summary:item.summary,schedule:item.schedule,application:item.application,
    audience:item.audience,location:item.location,cost:item.cost,sourceUrl:item.sourceUrl,posterText:item.posterLines.join('\n'),theme,tags:item.tags.join(', '),
    applyFrom:item.applyFrom??'',applyUntil:item.applyUntil??'',applyTime:item.applyTime?.slice(0,5)??'',startsAt:item.startsAt?.slice(0,16)??'',endsAt:item.endsAt?.slice(0,16)??'',
    registrationClosed:item.registrationClosed??false,removePoster:false};
}
