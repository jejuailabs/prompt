// GET /api/community/posts?board=all|free|qna|study|notice&q=&sort=new|popular&page=&mine=1
// POST /api/community/posts { board, title, body }
import { db } from '@/lib/db';
import { HttpError, getSessionUserFast, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { isBoardId } from '@/modules/community-board/boards';
import { BOARD_MODULE, parsePostInput, serializePost } from '@/modules/community-board/server';

const PAGE_SIZE = 20;
const OWNER = { select: { id: true, username: true, avatarUrl: true } } as const;

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const board = params.get('board');
    const q = params.get('q')?.trim();
    const sort = params.get('sort') === 'popular' ? 'popular' : 'new';
    const limit = Math.min(Math.max(Number(params.get('limit')) || PAGE_SIZE, 1), 50);
    const page = Math.max(Number(params.get('page')) || 1, 1);
    const user = await getSessionUserFast();
    const mine = params.get('mine') === '1';
    if (mine && !user) throw new HttpError('로그인이 필요합니다', 401);

    const where = {
      ...(mine && user ? { ownerId: user.id } : {}),
      sourceModule: BOARD_MODULE, type: 'text', status: 'published', visibility: 'public',
      ...(isBoardId(board) ? { metadata: { contains: `"board":"${board}"` } } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { description: { contains: q, mode: 'insensitive' as const } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      db.artifact.findMany({
        where, include: { owner: OWNER },
        orderBy: sort === 'popular' ? [{ likeCount: 'desc' }, { views: 'desc' }, { createdAt: 'desc' }] : { createdAt: 'desc' },
        take: limit, skip: (page - 1) * limit,
      }),
      db.artifact.count({ where }),
    ]);
    const liked = user && rows.length
      ? new Set((await db.vote.findMany({ where: { targetType: 'artifact', userId: user.id, targetId: { in: rows.map((row) => row.id) } }, select: { targetId: true } })).map((vote) => vote.targetId))
      : new Set<string>();
    return ok({ posts: rows.map((row) => serializePost(row, user, liked.has(row.id))), total, page, pageSize: limit });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = parsePostInput(await readJson(req), user);
    const number = (await db.artifact.count({ where: { sourceModule: BOARD_MODULE, type: 'text' } })) + 1;
    const row = await db.artifact.create({
      data: {
        ownerId: user.id, type: 'text', sourceModule: BOARD_MODULE, title: input.title, description: input.excerpt,
        status: 'published', visibility: 'public', metadata: JSON.stringify({ board: input.board, body: input.body, number }),
      },
      include: { owner: OWNER },
    });
    return ok(serializePost(row, user, false, true), 201);
  } catch (error) {
    return fail(error);
  }
}
