import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

const GAMES = [
  {
    title: '헬리 대쉬',
    description: '헬리콥터를 조종해 좁은 동굴 사이를 날아가세요. 클릭으로 상승, 놓으면 하강!',
    contentUrl: '/games/helicopter.html',
    fileUrl: null,
    tags: ['아케이드', '헬리콥터'],
    controls: '클릭/스페이스 = 상승, 놓으면 하강',
  },
  {
    title: '벽돌깨기',
    description: '패들로 공을 튕겨 모든 벽돌을 부수세요! 레벨이 올라갈수록 벽돌이 단단해집니다.',
    contentUrl: '/games/brick-breaker.html',
    fileUrl: null,
    tags: ['아케이드', '벽돌깨기'],
    controls: '마우스/터치 = 패들 이동',
  },
  {
    title: '네온 스네이크',
    description: '뱀을 조종해 먹이를 먹으며 길어지세요. 벽이나 자기 몸에 부딪히면 게임 오버!',
    contentUrl: '/games/snake.html',
    fileUrl: null,
    tags: ['클래식', '스네이크'],
    controls: '방향키/WASD, 모바일: 스와이프',
  },
  {
    title: '네온 테트리스',
    description: '떨어지는 블록을 쌓아 줄을 완성하세요. 레벨이 올라갈수록 빨라집니다!',
    contentUrl: '/games/tetris.html',
    fileUrl: null,
    tags: ['퍼즐', '테트리스'],
    controls: '← → = 이동, ↑ = 회전, 스페이스 = 드롭',
  },
  {
    title: '플래피 네온',
    description: '클릭으로 점프해 파이프 사이를 통과하세요. 단순하지만 중독성 있는 게임!',
    contentUrl: '/games/flappy.html',
    fileUrl: null,
    tags: ['아케이드', '플래피'],
    controls: '클릭/스페이스/탭 = 점프',
  },
  {
    title: '네온 퐁',
    description: 'CPU와 1:1 탁구 대결! 먼저 7점을 따면 승리합니다.',
    contentUrl: '/games/pong.html',
    fileUrl: null,
    tags: ['스포츠', '퐁'],
    controls: '↑ ↓ 또는 W S, 모바일: 터치 드래그',
  },
];

export async function POST() {
  try {
    await requireAdmin();

    const admin = await db.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return fail(new Error('No admin user found'));

    const created = [];
    for (const game of GAMES) {
      const exists = await db.artifact.findFirst({
        where: { title: game.title, type: 'game', sourceModule: 'game-room' },
      });
      if (exists) { created.push({ id: exists.id, title: game.title, status: 'skipped' }); continue; }

      const artifact = await db.artifact.create({
        data: {
          ownerId: admin.id,
          type: 'game',
          title: game.title,
          description: game.description,
          contentUrl: game.contentUrl,
          fileUrl: game.fileUrl,
          sourceModule: 'game-room',
          status: 'published',
          visibility: 'public',
          metadata: JSON.stringify({
            tags: game.tags,
            controls: game.controls,
            externalGame: false,
            moderationStatus: 'approved',
          }),
        },
      });
      created.push({ id: artifact.id, title: game.title, status: 'created' });
    }

    return ok({ seeded: created });
  } catch (e) {
    return fail(e);
  }
}
