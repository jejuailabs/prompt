// Publishing a generated video or song turns its generation prompt into a public
// Prompt (prompt gallery entry) with the result attached, so it appears in the
// prompt exhibition like any hand-written prompt with its outputs.
import { db } from '@/lib/db';
import { logEvent } from '@/lib/events';

const CATEGORY_BY_TYPE: Record<string, string> = { audio: '음악', video: '영상' };

function parseMeta(raw: string | null | undefined): Record<string, unknown> {
  try { return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}; } catch { return {}; }
}

function promptBody(type: string, meta: Record<string, unknown>, fallback: string): string {
  const prompt = typeof meta.prompt === 'string' ? meta.prompt.trim() : '';
  const lyrics = typeof meta.lyrics === 'string' ? meta.lyrics.trim() : '';
  if (type === 'audio') {
    const parts = [prompt && `[스타일]\n${prompt}`, lyrics && `[가사]\n${lyrics}`].filter(Boolean);
    return parts.join('\n\n') || fallback;
  }
  return prompt || fallback;
}

/** Creates and links the gallery prompt once; later publishes reuse it. */
export async function linkPromptOnPublish(artifactId: string, userId: string): Promise<string | null> {
  const artifact = await db.artifact.findUnique({ where: { id: artifactId } });
  if (!artifact || artifact.ownerId !== userId) return null;
  if (artifact.sourcePromptId) return artifact.sourcePromptId;
  const category = CATEGORY_BY_TYPE[artifact.type];
  if (!category) return null;

  const meta = parseMeta(artifact.metadata);
  const body = promptBody(artifact.type, meta, artifact.description || artifact.title);
  const model = typeof meta.model === 'string' ? meta.model : typeof meta.engine === 'string' ? meta.engine : '';
  const prompt = await db.prompt.create({
    data: {
      ownerId: userId,
      title: artifact.title.slice(0, 120),
      body,
      category,
      modelTags: JSON.stringify(model ? [model] : []),
      thumbnailUrl: typeof meta.thumbnailUrl === 'string' ? meta.thumbnailUrl : typeof meta.previewUrl === 'string' ? meta.previewUrl : null,
      status: 'active',
      visibility: 'public',
      artifactCount: 1,
    },
  });
  await db.promptVersion.create({ data: { promptId: prompt.id, body, versionNote: '결과물 게시로 생성', createdBy: userId } });
  await db.artifact.update({ where: { id: artifact.id }, data: { sourcePromptId: prompt.id } });
  await logEvent('prompt.created', { promptId: prompt.id, title: prompt.title, ownerId: userId, fromArtifactId: artifact.id });
  return prompt.id;
}
