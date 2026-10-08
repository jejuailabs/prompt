/** Shipped games stay playable before an administrator registers them in the database. */
const SHIPPED_GAMES = [
  {
    slug: 'luna-pinball', title: '루나 가든 핀볼', englishTitle: 'Luna Garden', publishedAt: '2026-10-08T01:01:31.000Z',
    description: '달빛 정원의 본격적인 3볼 핀볼. 황동 플리퍼로 꽃 범퍼와 오비트 램프를 공략하고 배수·잭팟·멀티볼로 최고 점수에 도전하세요.',
    contentUrl: '/games/luna-pinball.html', fileUrl: '/games/thumbs/luna-pinball.png', artUrl: '/games/thumbs/luna-pinball.png',
    tags: ['플리퍼 핀볼', '멀티볼'], controls: '← → / A·D = 플리퍼, 스페이스 누르고 놓기 = 발사, ↑ / X = 흔들기, 터치 버튼 지원', palette: '#769b8b', emoji: '🌙', playHint: '한 번 더, 달빛을 깨우는 한 방',
  },
  {
    slug: 'hamster-pinball', title: '햄스터 간식 핀볼', englishTitle: 'Snack Picnic', publishedAt: '2026-10-08T00:24:05.000Z',
    description: '볼빵빵한 햄스터를 통통! 다섯 번의 드롭과 두 번의 흔들기로 간식을 모으고, 움직이는 바구니 보너스로 최고 기록에 도전하세요.',
    contentUrl: '/games/hamster-pinball.html', fileUrl: '/games/thumbs/hamster-pinball.png', artUrl: '/games/thumbs/hamster-pinball.png',
    tags: ['물리 핀볼', '기록 도전'], controls: '탭 = 드롭, ← → = 위치 조절 / 떨어지는 동안 두 번 흔들기, 스페이스 = 드롭', palette: '#dba77a', emoji: '🐹', playHint: '다섯 번의 드롭, 달콤한 간식 소풍',
  },
  {
    slug: 'penguin-ice', title: '펭귄 얼음 소동', englishTitle: 'Ice Picnic', publishedAt: '2026-10-08T00:24:05.000Z',
    description: '얼음벽을 만들고 깨며 물개를 따돌리세요! 150초 동안 생선을 모으고 연속 수집 콤보로 기록을 겨루는 귀여운 생존 게임.',
    contentUrl: '/games/penguin-ice.html', fileUrl: '/games/thumbs/penguin-ice.png', artUrl: '/games/thumbs/penguin-ice.png',
    tags: ['얼음벽 전략', '생존'], controls: '방향키/WASD/화면 화살표 = 이동, 스페이스/얼음 버튼 = 얼음 만들기·깨기', palette: '#9bbdce', emoji: '🐧', playHint: '생선은 내 거야! 얼음 위의 작은 추격전',
  },
  {
    slug: 'donut-pop', title: '도넛 꽂기', englishTitle: 'Donut Pop', publishedAt: '2026-10-07T23:01:54.000Z',
    description: '돌아가는 도넛의 빈틈에 토핑을 톡! 딸기 보너스와 도넛 완성으로 더 달콤한 최고 기록에 도전하세요.',
    contentUrl: '/games/donut-pop.html', fileUrl: '/games/thumbs/donut-pop.png', artUrl: '/games/thumbs/donut-pop.png',
    tags: ['타이밍', '기록 도전'], controls: '탭/클릭/스페이스 = 토핑 꽂기', palette: '#d994ac', emoji: '🍩', playHint: '빈틈을 노려, 토핑을 톡!',
  },
  {
    slug: 'cat-bridge', title: '고양이 다리 건너기', englishTitle: 'Cat Bridge', publishedAt: '2026-10-07T23:01:54.000Z',
    description: '꾹 눌러 다리를 늘리고 손을 떼어 고양이를 건너게 해주세요. 발판 중앙의 PERFECT 콤보로 더 높은 점수에 도전!',
    contentUrl: '/games/cat-bridge.html', fileUrl: '/games/thumbs/cat-bridge.png', artUrl: '/games/thumbs/cat-bridge.png',
    tags: ['길이 맞추기', '기록 도전'], controls: '꾹 누르고 놓기 / 스페이스 누르고 떼기, ← → 길이 조절 + Enter', palette: '#86a999', emoji: '🐈', playHint: '조금 더 길게? 사뿐한 한 걸음',
  },
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
