/** Shipped games stay playable before an administrator registers them in the database. */
export const LITTLE_WORLDS = [
  {
    slug: 'fruit-atelier', title: '과일 아틀리에', englishTitle: 'Fruit Atelier',
    description: '햇살 드는 과일 가게에서 같은 과일을 합쳐 수박을 만들어보세요. 작고 달콤한 물리 퍼즐.',
    contentUrl: '/games/fruit-atelier.html', fileUrl: '/games/thumbs/fruit-atelier.png',
    artUrl: '/games/little-worlds/assets/fruit-cafe.webp',
    tags: ['과일 합치기', '퍼즐'], controls: '탭/클릭 = 떨어뜨리기, ← → = 위치 이동, 스페이스 = 드롭',
    palette: '#b7684d', emoji: '🍑', playHint: '시간제한 없이, 차곡차곡',
  },
  {
    slug: 'tidelight', title: '노을 낚시', englishTitle: 'Tidelight',
    description: '노을 바다에서 즐기는 다섯 번의 낚시. 초록 구간에 맞춰 줄을 당기고 여섯 물고기를 도감에 모아보세요.',
    contentUrl: '/games/tidelight.html', fileUrl: '/games/thumbs/tidelight.png',
    artUrl: '/games/little-worlds/assets/tidelight-harbor.webp',
    tags: ['타이밍', '낚시'], controls: '버튼/스페이스 = 던지기 · 줄 당기기',
    palette: '#426e67', emoji: '🐟', playHint: '한 판 5번의 작은 만남',
  },
  {
    slug: 'hidden-paws', title: '숨은 고양이 찾기', englishTitle: 'Hidden Paws',
    description: '햇살 드는 온실에 숨은 다섯 고양이를 찾아보세요. 그림을 확대하고 구석구석 작은 발견을 즐기는 게임.',
    contentUrl: '/games/hidden-paws.html', fileUrl: '/games/thumbs/hidden-paws.png',
    artUrl: '/games/little-worlds/assets/hidden-greenhouse.webp',
    tags: ['숨은그림찾기', '힐링'], controls: '탭/클릭 = 찾기, 확대 후 드래그 = 이동, 힌트 3회',
    palette: '#667447', emoji: '🐈', playHint: '온실 속 다섯 친구 찾기',
  },
] as const;

export function getLocalLittleWorld(id: string | undefined) {
  const item = LITTLE_WORLDS.find((game) => `builtin-${game.slug}` === id);
  return item ? {
    id: `builtin-${item.slug}`, title: item.title, description: item.description,
    contentUrl: item.contentUrl, fileUrl: item.fileUrl,
    ownerName: 'PLAYLAB', ownerId: '', playCount: 0, likeCount: 0, likedByMe: false,
    createdAt: '2026-10-07T00:00:00.000Z',
    metadata: { collection: 'little-worlds', controls: item.controls, localOnly: true },
  } : undefined;
}
