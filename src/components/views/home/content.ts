import type { ArtifactDTO, ArtifactType, PromptDTO, ViewKey } from '@/lib/types';
import { artifactThumbnail } from '@/lib/artifact-media';
export interface HomeEntry {
  id: string; title: string; description: string; image: string | null;
  type: ArtifactType | 'prompt'; category: string; by: string;
  destination: { view: ViewKey; params: Record<string, string> };
}
export function artifactEntry(artifact: ArtifactDTO): HomeEntry {
  return { id: `artifact:${artifact.id}`, title: artifact.title, description: artifact.description,
    image: artifactThumbnail(artifact), type: artifact.type, category: String(artifact.metadata?.categoryLabel || ''), by: artifact.owner?.username || '',
    destination: { view: artifact.type === 'game' ? 'game-play' : 'project', params: { id: artifact.id } } };
}
/** A linked work supplies the cover, but navigation retains the prompt's own ID. */
export function promptEntries(prompts: PromptDTO[], artifacts: ArtifactDTO[]): HomeEntry[] {
  return prompts.map(prompt => {
    const related = artifacts.find(work => work.sourcePromptId === prompt.id && artifactThumbnail(work));
    const thumbnail = prompt.thumbnailUrl && /^(https?:\/\/|\/[^/])/.test(prompt.thumbnailUrl) ? prompt.thumbnailUrl : null;
    return { id: `prompt:${prompt.id}`, title: prompt.title, description: prompt.body,
      image: thumbnail || (related ? artifactThumbnail(related) : null), type: 'prompt', category: prompt.category, by: prompt.owner?.username || '',
      destination: { view: 'prompt', params: { id: prompt.id } } };
  });
}
