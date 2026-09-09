// POST /api/game-room/play — record a game play session
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser().catch(() => null);
    const { artifactId, durationMs } = (await req.json()) as {
      artifactId?: string;
      durationMs?: number;
    };
    if (!artifactId) return ok({ recorded: false });

    await db.gamePlay.create({
      data: {
        artifactId,
        userId: user?.id ?? null,
        durationMs: durationMs ?? 0,
      },
    });

    return ok({ recorded: true });
  } catch (e) {
    return fail(e);
  }
}
