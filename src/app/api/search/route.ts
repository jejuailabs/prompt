// GET /api/search?q= — search prompts + published artifacts
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserFast } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializeArtifacts, serializePrompts } from '@/lib/server/serialize';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();
    const user = await getSessionUserFast();
    const userId = user?.id ?? null;

    if (!q) return ok({ prompts: [], artifacts: [] });

    const [promptRows, artifactRows] = await Promise.all([
      db.prompt.findMany({
        where: {
          status: 'active',
          OR: [{ title: { contains: q } }, { body: { contains: q } }],
        },
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      db.artifact.findMany({
        where: {
          status: 'published',
          visibility: 'public',
          OR: [{ title: { contains: q } }, { description: { contains: q } }],
        },
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    return ok({
      prompts: await serializePrompts(promptRows, userId),
      artifacts: await serializeArtifacts(artifactRows, userId),
    });
  } catch (e) {
    return fail(e);
  }
}
