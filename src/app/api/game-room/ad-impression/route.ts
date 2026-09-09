// POST /api/game-room/ad-impression — record ad view/click for revenue tracking
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser().catch(() => null);
    const { artifactId, slotType, clicked } = (await req.json()) as {
      artifactId?: string;
      slotType?: string;
      clicked?: boolean;
    };
    if (!artifactId) return ok({ recorded: false });

    await db.adImpression.create({
      data: {
        artifactId,
        userId: user?.id ?? null,
        slotType: slotType || 'banner',
        clicked: clicked ?? false,
      },
    });

    return ok({ recorded: true });
  } catch (e) {
    return fail(e);
  }
}
