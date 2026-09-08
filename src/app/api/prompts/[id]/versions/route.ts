// GET /api/prompts/[id]/versions — PromptVersionDTO[]
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const prompt = await db.prompt.findUnique({ where: { id }, select: { id: true } });
    if (!prompt) throw new HttpError('프롬프트를 찾을 수 없습니다', 404);

    const versions = await db.promptVersion.findMany({
      where: { promptId: id },
      orderBy: { createdAt: 'asc' },
    });

    const userIds = [...new Set(versions.map((v) => v.createdBy))];
    const users = await db.profile.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.username]));

    return ok(
      versions.map((v) => ({
        id: v.id,
        body: v.body,
        versionNote: v.versionNote,
        createdBy: v.createdBy,
        createdByName: nameById.get(v.createdBy) ?? null,
        createdAt: v.createdAt.toISOString(),
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
