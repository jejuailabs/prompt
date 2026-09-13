import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { serializeArtifactSingle } from '@/lib/server/serialize';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = await db.artifact.findFirst({
      where: { id, ownerId: user.id, sourceModule: 'video-studio' },
      include: { owner: true },
    });
    if (!project) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);
    return ok(await serializeArtifactSingle(project, user.id));
  } catch (e) {
    return fail(e);
  }
}
