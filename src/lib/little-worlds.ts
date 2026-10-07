/** Shipped games stay playable before an administrator registers them in the database. */
const SHIPPED_GAMES = [
  {
    slug: 'fruit-atelier', title: '과일 아틀리에', englishTitle: 'Fruit Atelier', publishedAt: '2026-10-07T01:23:45.000Z',
    description: '햇살 드는 과일 가게에서 같은 과일을 합쳐 수박을 만들어보세요. 작고 달콤한 물리 퍼즐.',
    contentUrl: '/games/fruit-atelier.html', fileUrl: '/games/thumbs/fruit-atelier.png',
    artUrl: '/games/little-worlds/assets/fruit-cafe.webp',
    tags: ['과일 합치기', '퍼즐'], controls: '탭/클릭 = 떨어뜨리기, ← → = 위치 이동, 스페이스 = 드롭',
    palette: '#b7684d', emoji: '🍑', playHint: '시간제한 없이, 차곡차곡',
  },
  {
    slug: 'tidelight', title: '노을 낚시', englishTitle: 'Tidelight', publishedAt: '2026-10-07T01:23:45.000Z',
    description: '노을 바다에서 즐기는 다섯 번의 낚시. 초록 구간에 맞춰 줄을 당기고 여섯 물고기를 도감에 모아보세요.',
    contentUrl: '/games/tidelight.html', fileUrl: '/games/thumbs/tidelight.png',
    artUrl: '/games/little-worlds/assets/tidelight-harbor.webp',
    tags: ['타이밍', '낚시'], controls: '버튼/스페이스 = 던지기 · 줄 당기기',
    palette: '#426e67', emoji: '🐟', playHint: '한 판 5번의 작은 만남',
  },
  {
    slug: 'hidden-paws', title: '숨은 고양이 찾기', englishTitle: 'Hidden Paws', publishedAt: '2026-10-07T01:23:45.000Z',
    description: '햇살 드는 온실에 숨은 다섯 고양이를 찾아보세요. 그림을 확대하고 구석구석 작은 발견을 즐기는 게임.',
    contentUrl: '/games/hidden-paws.html', fileUrl: '/games/thumbs/hidden-paws.png',
    artUrl: '/games/little-worlds/assets/hidden-greenhouse.webp',
    tags: ['숨은그림찾기', '힐링'], controls: '탭/클릭 = 찾기, 확대 후 드래그 = 이동, 힌트 3회',
    palette: '#667447', emoji: '🐈', playHint: '온실 속 다섯 친구 찾기',
  },
  {
    slug:'jelly-garden',title:'젤리 정원',englishTitle:'Jelly Garden',description:'말랑한 젤리들을 모아 톡! 25번의 선택, 큰 무리와 반짝별·주문 보너스로 최고 점수에 도전하는 퍼즐.',
    contentUrl:'/games/jelly-garden.html',fileUrl:'/games/thumbs/jelly-garden.png',artUrl:'/games/little-worlds/assets/patisserie-garden.webp', publishedAt:'2026-10-07T15:03:53.000Z',
    tags:['젤리 퍼즐','기록 도전'],controls:'같은 젤리 2개 이상 탭/클릭, 방향키+Enter로 선택',palette:'#ab749d',emoji:'🍮',playHint:'25번의 선택, 나만의 최고 점수',
  },
  {
    slug:'macaron-tower',title:'마카롱 타워',englishTitle:'Macaron Tower',description:'알록달록 마카롱을 차곡차곡! 삐져나온 부분은 떨어지고, PERFECT 콤보로 더 높은 탑과 점수에 도전하는 타이밍 게임.',
    contentUrl:'/games/macaron-tower.html',fileUrl:'/games/thumbs/macaron-tower.png',artUrl:'/games/little-worlds/assets/patisserie-garden.webp', publishedAt:'2026-10-07T15:03:53.000Z',
    tags:['타이밍','기록 도전'],controls:'탭/클릭/스페이스 = 마카롱 놓기',palette:'#c29b78',emoji:'🍰',playHint:'정확한 타이밍, 더 높은 기록',
  },
] as const;

// Publication time belongs to the shipped game, not to its first saved score.
export const LITTLE_WORLDS = [...SHIPPED_GAMES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function getLocalLittleWorld(id: string | undefined) {
  const item = LITTLE_WORLDS.find((game) => `builtin-${game.slug}` === id);
  return item ? {
    id: `builtin-${item.slug}`, title: item.title, description: item.description,
    contentUrl: item.contentUrl, fileUrl: item.fileUrl,
    ownerName: 'PLAYLAB', ownerId: '', playCount: 0, likeCount: 0, likedByMe: false,
    createdAt: item.publishedAt,
    metadata: { collection: 'little-worlds', controls: item.controls, builtin: true },
  } : undefined;
}
