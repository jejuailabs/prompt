// Source list for the daily AI 일정 collector. Add a source = add a row (no code elsewhere).
// Checked 2026-10-24: each host's robots.txt allows these paths (net.ts re-checks on every run).
// Not collected on purpose: jeju.go.kr, jejutp.or.kr, jejunu.ac.kr (robots.txt disallows all bots).
export type SourceDef =
  | { id: string; name: string; type: 'rss'; url: string; allow: RegExp; max: number; poster?: boolean }
  | { id: string; name: string; type: 'board'; lists: string[]; link: RegExp; max: number }
  | { id: string; name: string; type: 'naver'; queries: string[]; max: number }
  | { id: string; name: string; type: 'kstartup'; max: number }
  | { id: string; name: string; type: 'bizinfo'; max: number };

export const SOURCES: SourceDef[] = [
  // 잇지제주 aggregates 제주TP, 제주한라대, 도청 사업 etc. We take the facts and re-write them in COAI form.
  { id: 'idge', name: '잇지제주', type: 'rss', url: 'https://www.idge.co.kr/rss', allow: /^\/(edu|support|activity|program_events)\//, max: 15 },
  { id: 'ofjeju', name: '제주콘텐츠진흥원', type: 'board', lists: ['https://www.ofjeju.kr/communication/notifications.htm'], link: /\/communication\/notifications\.htm\?[^#]*act=view[^#]*seq=\d+/, max: 8 },
  { id: 'jejuyouth', name: '제주청년센터', type: 'board', lists: ['https://jejuyouth.com/bbs/board.php?bo_table=1_2_2_1', 'https://jejuyouth.com/bbs/board.php?bo_table=1_2_1_1'], link: /\/bbs\/board\.php\?bo_table=\w+&wr_id=\d+/, max: 8 },
  { id: 'halla-rise', name: '제주한라대 RISE사업단', type: 'board', lists: ['https://chu.jejurise.kr/news/notice.htm'], link: /\/news\/notice\.htm\?[^#]*act=view[^#]*seq=\d+/, max: 6 },
  { id: 'jeju-rise', name: '제주RISE센터', type: 'board', lists: ['https://jejurise.kr/news/notice.htm'], link: /\/news\/notice\.htm\?[^#]*act=view[^#]*seq=\d+/, max: 6 },
  // Needs keys (env). Skipped quietly when the key is missing.
  { id: 'naver', name: '네이버 뉴스', type: 'naver', max: 10, queries: ['제주 AI 교육 모집', '제주테크노파크 모집', '제주 해커톤', '제주 AI 특강', '제주도 AI 행사', '제주 청년 AI 공모전', '제주콘텐츠진흥원 교육 모집', '제주한라대학교 AI'] },
  { id: 'kstartup', name: 'K-Startup', type: 'kstartup', max: 8 },
  { id: 'bizinfo', name: '기업마당', type: 'bizinfo', max: 8 },
];
