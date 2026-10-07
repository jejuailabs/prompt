export type EventKind = 'course' | 'contest' | 'event';
export type AiEvent = {
  id: string; kind: EventKind; title: string; posterLines: string[]; subtitle: string;
  organizer: string; summary: string; audience: string; location: string; cost: string;
  schedule: string; application: string; sourceUrl: string; verifiedAt: string;
  tags: string[]; accent: string; surface: string; motif: 'award' | 'code' | 'network' | 'chat' | 'learning' | 'agents';
  applyFrom?: string; applyUntil?: string; applyTime?: string; startsAt?: string; endsAt?: string;
  registrationClosed?: boolean; sourceNote?: string;
  posterUrl?: string; ownerId?: string; authorName?: string; published?: boolean; origin?: 'admin';
};
export const EVENT_KINDS = { course: '강의 · 교육', contest: '공모전 · 대회', event: '행사 · 세미나' };
// Editorial records verified against organizer notices. Unknown fees and deadlines are not inferred.
export const AI_EVENTS: AiEvent[] = [
  { id:'ai-korea-awards-2026', kind:'contest', title:'2026 이데일리 AI코리아 대상', posterLines:['AI KOREA','AWARDS','2026'], subtitle:'AI로 산업과 일상을 바꾼 기업·기관을 찾습니다',
    organizer:'이데일리', summary:'AI 기술을 개발하거나 제조·의료·교육·공공 등 현장에서 AI 활용 성과를 낸 기업과 기관을 모집합니다. 기술 개발과 실제 적용 성과를 주최측 기준에 따라 심사하는 공모입니다.',
    audience:'AI 기술·활용 성과를 보유한 기업 및 기관', location:'시상식: 서울 JW메리어트 동대문', cost:'접수 무료', schedule:'시상식 2026.11.12 · 17:00', application:'2026.10.09까지 접수', applyUntil:'2026-10-09',
    sourceUrl:'https://www.edaily.co.kr/News/Read?newsId=03191446645581104', verifiedAt:'2026-10-07', tags:['AI 활용','기업·기관','대상 공모'], accent:'#f4cc94', surface:'#4c372b', motif:'award' },
  { id:'vibe-coding-hero', kind:'course', title:'AI 바이브코딩 히어로', posterLines:['AI 바이브코딩','히어로'], subtitle:'아이디어를 웹서비스로 만드는 실시간 수업',
    organizer:'AI미래교육연구회', summary:'코딩 경험이 없는 사람도 자연어로 AI에게 요청하고, 결과를 확인하며 웹서비스를 만드는 과정을 배우는 수업입니다. 학교생활 속 문제를 발견하고 사용자의 요구를 정리해 서비스를 설계·제작합니다.',
    audience:'바이브코딩과 문제해결 수업에 관심 있는 연구회원', location:'온라인 Zoom', cost:'회원제 · 조건 원문 확인', schedule:'2026.10.14 · 19:30–21:30', application:'접수 마감일 별도 확인',
    startsAt:'2026-10-14T19:30:00+09:00',endsAt:'2026-10-14T21:30:00+09:00', sourceUrl:'https://godedu.co.kr/course/ai-225/', verifiedAt:'2026-10-07', tags:['바이브코딩','웹서비스','온라인 수업'], accent:'#bbdbd1', surface:'#23433d', motif:'code' },
  { id:'ai-festa-2026', kind:'event', title:'인공지능 페스타 2026', posterLines:['AI','FESTA','2026'], subtitle:'AI 기술과 실제 비즈니스가 만나는 자리',
    organizer:'과학기술정보통신부', summary:'인공지능주간 공식 행사로, AI 에이전트·피지컬 AI·AI 보안·반도체 등 산업 현장의 기술과 적용 사례를 만나는 전시입니다. 전시·행사별 세부 프로그램은 공식 안내에서 확인할 수 있습니다.',
    audience:'AI 기술·비즈니스에 관심 있는 관람객', location:'서울 코엑스 Hall C', cost:'사전등록 무료 / 현장등록 10,000원', schedule:'2026.10.06–10.08 · 마지막 날 16:00 종료', application:'관람·등록 조건 원문 확인',
    startsAt:'2026-10-06T10:00:00+09:00',endsAt:'2026-10-08T16:00:00+09:00', sourceUrl:'https://www.coex.co.kr/exhibitions/인공지능-페스타-2026/', verifiedAt:'2026-10-07', tags:['AI 에이전트','전시','코엑스'], accent:'#c2c5fb', surface:'#313b60', motif:'network' },
  { id:'claude-first-class', kind:'course', title:'클로드, 오늘 처음 켭니다', posterLines:['클로드,','오늘 처음','켭니다.'], subtitle:'말로 시작하는 문서와 데이터 작업',
    organizer:'AI미래교육연구회', summary:'클로드를 처음 사용하는 사람을 위한 실시간 수업입니다. 구글 시트와 한글 문서 등 일상적인 업무를 자연어 요청으로 다루는 내용을 안내합니다.',
    audience:'클로드 입문과 AI 업무 활용에 관심 있는 연구회원', location:'온라인 Zoom', cost:'회원제 · 조건 원문 확인', schedule:'2026.10.12 · 19:00–21:00', application:'접수 마감일 별도 확인',
    startsAt:'2026-10-12T19:00:00+09:00',endsAt:'2026-10-12T21:00:00+09:00', sourceUrl:'https://godedu.co.kr/course/ai-226/', verifiedAt:'2026-10-07', tags:['Claude','업무 활용','입문'], accent:'#edbba6', surface:'#4b2c28', motif:'chat' },
  { id:'small-business-ai-2026', kind:'course', title:'2026 소상공인 AI 활용 교육', posterLines:['우리 가게에','AI를','더하다.'], subtitle:'소상공인의 AI 활용과 디지털 역량을 위한 교육',
    organizer:'한국생산성본부', summary:'디지털 취약계층 소상공인을 대상으로 AI 활용과 디지털 역량 강화를 지원하는 교육입니다. 전국 10개 권역에서 진행하며 교육일정은 권역별로 다릅니다.',
    audience:'디지털 취약계층 소상공인', location:'전국 10개 권역 · 지역별 확인', cost:'비용 원문 확인', schedule:'교육일정 권역별 상이', application:'2026.07.10–10.31 모집', applyFrom:'2026-07-10',applyUntil:'2026-10-31',
    sourceUrl:'https://www.kpc.or.kr/kpc/PTWHP004_recruit_view.do?npno=28131', verifiedAt:'2026-10-07', tags:['소상공인','AI 활용','실무 교육'], accent:'#d1dca4', surface:'#36482c', motif:'learning' },
  { id:'ai-top-100-2026', kind:'contest', title:'AI_TOP_100 2026', posterLines:['AI','TOP 100','2026'], subtitle:'현실의 문제를 해결하는 AI 에이전트 챌린지',
    organizer:'카카오임팩트', summary:'주어진 문제를 정의하고 AI 에이전트를 제작해 해결하는 개인전입니다. 온라인 예선을 거쳐 100명이 오프라인 본선에 진출합니다. 공식 사이트에서 참가 신청 마감 안내를 확인했습니다.',
    audience:'만 14세 이상 개인 · 세부 거주·참가 조건 원문 확인', location:'온라인 예선 / 본선 카카오 AI 캠퍼스', cost:'참가 조건 원문 확인', schedule:'예선 2026.10.31 / 본선 11.21', application:'당초 접수 마감 10.21 · 18:00 / 선착순 마감 안내', applyUntil:'2026-10-21',applyTime:'18:00',registrationClosed:true,
    sourceNote:'주최측 메인에서 “참가 신청이 마감되었습니다”를 확인했습니다. 당초 마감일과 관계없이 접수 마감으로 표시합니다.',
    sourceUrl:'https://aitop100.org/',verifiedAt:'2026-10-07',tags:['AI 에이전트','개인전','접수 마감'],accent:'#aecfef',surface:'#203954',motif:'agents' },
];

export function koreaDate(now: Date) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function deadlineAt(item: AiEvent) { return item.applyUntil ? Date.parse(item.applyUntil+'T'+(item.applyTime??'23:59:59')+'+09:00') : null; }
export function eventStatus(item: AiEvent, now: Date) {
  const time=now.getTime(),deadline=deadlineAt(item);
  if(item.registrationClosed) return {code:'closed',label:'접수 마감'};
  if(deadline!==null&&time>=deadline) return {code:'closed',label:'접수 마감'};
  if(item.endsAt&&time>=Date.parse(item.endsAt)) return {code:'closed',label:'일정 종료'};
  if(item.startsAt&&time>=Date.parse(item.startsAt)&&item.endsAt) return {code:'ongoing',label:'진행 중'};
  if(item.applyFrom&&koreaDate(now)<item.applyFrom) return {code:'upcoming',label:'접수 예정'};
  if(deadline!==null) return {code:'open',label:'모집 안내'};
  return {code:'upcoming',label:item.startsAt?'개최 예정':'일정 안내'};
}
export function eventCountdown(item: AiEvent, now: Date) {
  const status=eventStatus(item,now);
  if(status.code==='closed') return status.label;
  if(status.code==='ongoing') return '진행 중';
  if(item.applyUntil) {
    const days=Math.round((Date.parse(item.applyUntil+'T00:00:00+09:00')-Date.parse(koreaDate(now)+'T00:00:00+09:00'))/86400000);
    return days===0?'오늘 마감':`D-${days}`;
  }
  return item.startsAt ? koreaDate(new Date(item.startsAt)).slice(5).replace('-','.') : '원문 확인';
}
export function filterEvents(items: AiEvent[], options:{kind?:string;query?:string;hideClosed?:boolean}, now:Date) {
  const query=(options.query??'').toLowerCase().trim();
  return items.filter(item=>(!options.kind||item.kind===options.kind)&&(!options.hideClosed||eventStatus(item,now).code!=='closed')&&[item.title,item.subtitle,item.organizer,...item.tags].join(' ').toLowerCase().includes(query))
    .sort((a,b)=>Number(eventStatus(a,now).code==='closed')-Number(eventStatus(b,now).code==='closed') || (deadlineAt(a)??Date.parse(a.endsAt??a.startsAt??'9999-12-31'))-(deadlineAt(b)??Date.parse(b.endsAt??b.startsAt??'9999-12-31')));
}
