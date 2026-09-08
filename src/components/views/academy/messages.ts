// academy view namespace — 가이드 & 튜토리얼 (owned by views-a)
const messages = {
  ko: {
    title: '가이드 & 튜토리얼',
    subtitle: '바이브코딩 입문부터 출시까지',
    startLearning: '학습 시작',
    emptyTitle: '아직 강의가 없습니다',
    emptyDesc: '곧 첫 강의가 공개될 예정입니다',
    moreComing: '더 많은 강의가 추가될 예정입니다',
    loadError: '강의 목록을 불러오지 못했습니다',
  },
  en: {
    title: 'Guides & Tutorials',
    subtitle: 'From vibe-coding basics to launch',
    startLearning: 'Start learning',
    emptyTitle: 'No lessons yet',
    emptyDesc: 'The first lesson is coming soon',
    moreComing: 'More lessons are on the way',
    loadError: 'Failed to load lessons',
  },
} as const;

export default messages;
