import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

const GAMES = [
  {
    title: '스페이스 슈터',
    description: '우주선을 조종해 적을 물리치세요! 터치/클릭으로 발사, 좌우로 이동!',
    contentUrl: '/games/space-shooter.html',
    fileUrl: null,
    tags: ['액션', '슈팅'],
    controls: '← → 이동, 스페이스 발사, 모바일: 터치',
    palette: '#a78bfa',
    emoji: '🚀',
  },
  {
    title: '헬리 대쉬',
    description: '헬리콥터를 조종해 좁은 동굴 사이를 날아가세요. 클릭으로 상승, 놓으면 하강!',
    contentUrl: '/games/helicopter.html',
    fileUrl: null,
    tags: ['아케이드', '헬리콥터'],
    controls: '클릭/스페이스 = 상승, 놓으면 하강',
    palette: '#7c3aed',
    emoji: '🚁',
  },
  {
    title: '벽돌깨기',
    description: '패들로 공을 튕겨 모든 벽돌을 부수세요! 레벨이 올라갈수록 벽돌이 단단해집니다.',
    contentUrl: '/games/brick-breaker.html',
    fileUrl: null,
    tags: ['아케이드', '벽돌깨기'],
    controls: '마우스/터치 = 패들 이동',
    palette: '#f472b6',
    emoji: '🧱',
  },
  {
    title: '네온 스네이크',
    description: '뱀을 조종해 먹이를 먹으며 길어지세요. 벽이나 자기 몸에 부딪히면 게임 오버!',
    contentUrl: '/games/snake.html',
    fileUrl: null,
    tags: ['클래식', '스네이크'],
    controls: '방향키/WASD, 모바일: 스와이프',
    palette: '#34d399',
    emoji: '🐍',
  },
  {
    title: '네온 테트리스',
    description: '떨어지는 블록을 쌓아 줄을 완성하세요. 레벨이 올라갈수록 빨라집니다!',
    contentUrl: '/games/tetris.html',
    fileUrl: null,
    tags: ['퍼즐', '테트리스'],
    controls: '← → = 이동, ↑ = 회전, 스페이스 = 드롭',
    palette: '#60a5fa',
    emoji: '🟦',
  },
  {
    title: '플래피 네온',
    description: '클릭으로 점프해 파이프 사이를 통과하세요. 단순하지만 중독성 있는 게임!',
    contentUrl: '/games/flappy.html',
    fileUrl: null,
    tags: ['아케이드', '플래피'],
    controls: '클릭/스페이스/탭 = 점프',
    palette: '#fbbf24',
    emoji: '🐤',
  },
  {
    title: '네온 퐁',
    description: 'CPU와 1:1 탁구 대결! 먼저 7점을 따면 승리합니다.',
    contentUrl: '/games/pong.html',
    fileUrl: null,
    tags: ['스포츠', '퐁'],
    controls: '↑ ↓ 또는 W S, 모바일: 터치 드래그',
    palette: '#06b6d4',
    emoji: '🏓',
  },
  {
    title: '애니팡 매치3',
    description: '귀여운 캐릭터를 3개 이상 맞춰 없애세요! 콤보와 연쇄 폭발로 고득점 도전!',
    contentUrl: '/games/match3.html',
    fileUrl: null,
    tags: ['퍼즐', '매치3', '캐주얼'],
    controls: '드래그로 스왑, 60초 타이머',
    palette: '#ec4899',
    emoji: '🐱',
  },
  {
    title: '네온 마인',
    description: '지뢰를 피해 안전한 셀을 모두 열어보세요! 숫자 힌트로 지뢰 위치를 추리하세요.',
    contentUrl: '/games/minesweeper.html',
    fileUrl: null,
    tags: ['퍼즐', '지뢰찾기'],
    controls: '클릭=열기, 우클릭/길게누르기=깃발',
    palette: '#22c55e',
    emoji: '💣',
  },
  {
    title: '네온 양궁',
    description: '바람을 읽고 과녁 정중앙을 맞추세요! 라운드마다 과녁이 흔들립니다.',
    contentUrl: '/games/archery.html',
    fileUrl: null,
    tags: ['스포츠', '양궁'],
    controls: '클릭/탭=활 쏘기',
    palette: '#f59e0b',
    emoji: '🏹',
  },
  {
    title: '네온 2048',
    description: '같은 숫자 타일을 합쳐 2048을 만드세요! 간단하지만 중독성 있는 퍼즐!',
    contentUrl: '/games/puzzle2048.html',
    fileUrl: null,
    tags: ['퍼즐', '2048'],
    controls: '방향키/WASD/스와이프',
    palette: '#8b5cf6',
    emoji: '🔢',
  },
];

export async function POST() {
  try {
    await requireAdmin();

    const admin = await db.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return fail(new Error('No admin user found'));

    const created: Array<{ id: string; title: string; status: string }> = [];
    for (const game of GAMES) {
      const exists = await db.artifact.findFirst({
        where: { title: game.title, type: 'game', sourceModule: 'game-room' },
      });
      if (exists) {
        let existingMeta: Record<string, unknown> = {};
        try { existingMeta = JSON.parse(exists.metadata); } catch {}
        const updatedMeta = { ...existingMeta, params: { ...((existingMeta.params as Record<string, unknown>) || {}), palette: game.palette }, emoji: game.emoji };
        await db.artifact.update({ where: { id: exists.id }, data: { metadata: JSON.stringify(updatedMeta) } });
        created.push({ id: exists.id, title: game.title, status: 'updated' });
        continue;
      }

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
            params: { palette: game.palette },
            emoji: game.emoji,
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
