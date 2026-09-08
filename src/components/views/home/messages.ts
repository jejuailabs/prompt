// home view namespace — 전시실 (owned by views-a)
const messages = {
  ko: {
    heroTitle1: '아이디어를 만들고,',
    heroTitle2: '실험하고,',
    heroTitle3: '세상에 선보이세요',
    heroImgAlt: 'PLAYLAB 일러스트',
    makeProject: '프로젝트 만들기',
    openLab: '모델 실험실 열기',
    recommended: '오늘의 추천',
    feedEmptyTitle: '아직 추천 결과물이 없습니다',
    feedEmptyDesc: '가장 먼저 결과물을 게시하고 전시실의 주인공이 되어보세요',
    loadError: '추천 피드를 불러오지 못했습니다',
  },
  en: {
    heroTitle1: 'Make ideas,',
    heroTitle2: 'experiment with them,',
    heroTitle3: 'and show them to the world',
    heroImgAlt: 'PLAYLAB illustration',
    makeProject: 'Create a Project',
    openLab: 'Open Model Lab',
    recommended: "Today's Picks",
    feedEmptyTitle: 'No featured results yet',
    feedEmptyDesc: 'Be the first to publish a result and take the spotlight',
    loadError: 'Failed to load the featured feed',
  },
} as const;

export default messages;
