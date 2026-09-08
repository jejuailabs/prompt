// GET /api/smoke-tests/[id] — SmokeTestDTO (report parsed)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializeSmokeTest } from '@/lib/server/serialize';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const smokeTest = await db.smokeTest.findUnique({
      where: { id },
      include: {
        artifact: { include: { owner: true } },
        report: true,
      },
    });
    if (!smokeTest) throw new HttpError('스모크 테스트를 찾을 수 없습니다', 404);
    return ok(serializeSmokeTest(smokeTest));
  } catch (e) {
    return fail(e);
  }
}
