// GET /api/ranking — top 5 prompts & top 5 published artifacts by likeCount
import { db } from '@/lib/db';
import { getSessionUserFast } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';
import { loadPromptExtras, loadSocial, serializeArtifacts, serializePrompt } from '@/lib/server/serialize';

export async function GET() {
  try {
    const user = await getSessionUserFast();
    const userId = user?.id ?? null;

    const [promptRows, artifactRows] = await Promise.all([
      db.prompt.findMany({
        where: { status: 'active' },
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.artifact.findMany({
        where: { status: 'published', visibility: 'public' },
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const [promptSocial, promptExtras, artifactSocial] = await Promise.all([
      loadSocial('prompt', promptRows.map((p) => p.id), userId),
      loadPromptExtras(promptRows.map((p) => p.id)),
      loadSocial('artifact', artifactRows.map((a) => a.id), userId),
    ]);

    const topPrompts = [...promptRows]
      .sort((a, b) => (promptSocial.likes.get(b.id) ?? 0) - (promptSocial.likes.get(a.id) ?? 0))
      .slice(0, 5)
      .map((p) => serializePrompt(p, promptSocial, promptExtras));

    const topArtifacts = [...artifactRows]
      .sort((a, b) => (artifactSocial.likes.get(b.id) ?? 0) - (artifactSocial.likes.get(a.id) ?? 0))
      .slice(0, 5);

    return ok({
      prompts: topPrompts,
      artifacts: await serializeArtifacts(topArtifacts, userId),
    });
  } catch (e) {
    return fail(e);
  }
}
