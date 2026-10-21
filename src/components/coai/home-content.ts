// Editorial content for the COAI home until admin banner / guide management
// ships (S3). Content text is data, not UI chrome, so it lives here instead of
// the i18n message packs.
import type { ViewKey } from '@/lib/types';

export type PosterTheme = 'event' | 'feature' | 'challenge' | 'news';

export type HomePoster = {
  id: string;
  theme: PosterTheme;
  badgeKey: 'posterEvent' | 'posterFeature' | 'posterNews';
  title: string;
  description: string;
  cta: string;
  image: string;
  target: { view: ViewKey; params?: Record<string, string> };
};

export const HOME_POSTERS: HomePoster[] = [
  { id: 'daily', theme: 'event', badgeKey: 'posterEvent', title: 'AI와 함께\n더 편리한 일상', description: '지금, AI로 바뀌는\n새로운 가능성을 경험하세요.', cta: '자세히 보기', image: '/coai/posters/event.webp', target: { view: 'ai-events' } },
  { id: 'guide', theme: 'feature', badgeKey: 'posterFeature', title: '처음 시작하는\n생성형 AI 가이드', description: '누구나 쉽게 따라하는\n실전 활용법을 만나보세요.', cta: '지금 확인하기', image: '/coai/posters/feature.webp', target: { view: 'vibe-setup' } },
  { id: 'challenge', theme: 'challenge', badgeKey: 'posterEvent', title: 'AI 도구 100%\n활용 챌린지', description: '하루 10분,\nAI로 달라지는 일상을 만들어보세요.', cta: '지금 참여하기', image: '/coai/posters/challenge.webp', target: { view: 'ai-tools' } },
  { id: 'trend', theme: 'news', badgeKey: 'posterNews', title: '일하는 방식을 바꾸는\n최신 AI 트렌드', description: '지금 주목해야 할\nAI 소식과 인사이트를 확인하세요.', cta: '자세히 보기', image: '/coai/posters/news.webp', target: { view: 'ai-events' } },
  { id: 'study', theme: 'event', badgeKey: 'posterEvent', title: '같이 배우는\nAI 스터디 모집', description: '모임 회원과 함께\n매주 하나씩 배워봐요.', cta: '모집 보기', image: '/coai/posters/study.webp', target: { view: 'academy' } },
];

// Photo-poster sample (2026-10-21): real AI 일정 records shown as event/course
// posters. Photos are generated without text; headline and details are HTML.
export type PhotoPosterKind = 'event' | 'course' | 'contest';
export type HomePhotoPoster = {
  id: string;
  kind: PhotoPosterKind;
  badge: string;
  title: string;
  when: string;
  where: string;
  cta: string;
  image: string;
  eventId: string;
};

export const HOME_PHOTO_POSTERS: HomePhotoPoster[] = [
  { id: 'festa', kind: 'event', badge: '행사', title: '인공지능\n페스타 2026', when: '2026.10.06 – 10.08', where: '서울 코엑스 Hall C', cta: '사전등록 안내', image: '/coai/posters/photo/festa.webp', eventId: 'ai-festa-2026' },
  { id: 'claude', kind: 'course', badge: '강의', title: '클로드,\n오늘 처음 켭니다', when: '2026.10.12 (일) 19:00', where: '온라인 Zoom', cta: '수업 보기', image: '/coai/posters/photo/claude.webp', eventId: 'claude-first-class' },
  { id: 'vibe', kind: 'course', badge: '강의', title: 'AI 바이브코딩\n히어로', when: '2026.10.14 (화) 19:30', where: '온라인 Zoom', cta: '수업 보기', image: '/coai/posters/photo/vibe.webp', eventId: 'vibe-coding-hero' },
  { id: 'shop', kind: 'course', badge: '교육', title: '우리 가게에\nAI를 더하다', when: '10.31까지 모집', where: '전국 10개 권역', cta: '모집 안내', image: '/coai/posters/photo/shop.webp', eventId: 'small-business-ai-2026' },
  { id: 'award', kind: 'contest', badge: '공모전', title: 'AI 코리아\n대상 2026', when: '시상식 2026.11.12', where: 'JW메리어트 동대문', cta: '자세히 보기', image: '/coai/posters/photo/award.webp', eventId: 'ai-korea-awards-2026' },
];

export type GuideService = { slug: string; name: string; summary: string; description: string; icon: string; color: string; url: string };

// Brand marks are LobeHub icons (MIT, public/coai/brands/SOURCES.txt), drawn
// white on the brand-color tile. Copy follows the aiguidepage AI 전시관.
export const GUIDE_SERVICES: GuideService[] = [
  { slug: 'chatgpt', name: 'ChatGPT', summary: '대화·글쓰기', description: '일상의 질문부터 글쓰기와 아이디어까지, 대화하며 함께 풀어가는 AI예요.', icon: '/coai/brands/openai.svg', color: '#10A37F', url: 'https://chatgpt.com' },
  { slug: 'claude', name: 'Claude', summary: '긴 문서·글 다듬기', description: '문서를 함께 읽고, 생각을 정리하고, 글의 완성도를 높이는 대화 상대예요.', icon: '/coai/brands/claude-color.svg', color: '#D97757', url: 'https://claude.ai' },
  { slug: 'gemini', name: 'Gemini', summary: '글·이미지 이해', description: '글과 이미지에 대해 질문하고, 새로운 아이디어를 탐색할 수 있는 Google의 AI예요.', icon: '/coai/brands/gemini-color.svg', color: '#4F7BF7', url: 'https://gemini.google.com' },
  { slug: 'perplexity', name: 'Perplexity', summary: '출처 있는 검색', description: '궁금한 내용을 검색하고, 답변과 함께 제시된 출처를 확인하며 더 깊이 알아보세요.', icon: '/coai/brands/perplexity.svg', color: '#1F8A8A', url: 'https://www.perplexity.ai' },
  { slug: 'notebooklm', name: 'NotebookLM', summary: '내 자료 정리', description: '내가 넣은 자료를 바탕으로 질문하고, 핵심 내용을 정리하며 이해를 깊게 할 수 있어요.', icon: '/coai/brands/notebooklm.svg', color: '#1F2937', url: 'https://notebooklm.google.com' },
  { slug: 'suno', name: 'Suno', summary: '노래 만들기', description: '원하는 분위기와 주제를 적어 나만의 노래를 만들어 보세요. 음악 경험이 없어도 시작할 수 있어요.', icon: '/coai/brands/suno.svg', color: '#7C5CE0', url: 'https://suno.com' },
];
