'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { artifactShareUrl, builtinEmbedArtifact } from '@/lib/artifact-embed';
import type { ArtifactDTO } from '@/lib/types';
import { PreviewRenderer } from '@/components/shared/preview-renderer';
import { Button } from '@/components/ui/button';

export function ArtifactEmbed({ id }: { id: string }) {
  const builtin = builtinEmbedArtifact(id);
  const query = useQuery({
    queryKey: ['artifact-embed', id],
    queryFn: () => api.get<ArtifactDTO>(`/api/embed/${encodeURIComponent(id)}`),
    enabled: !builtin,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const artifact = builtin ?? (query.isError ? undefined : query.data);
  return <main className="fixed inset-0 z-[70] grid grid-rows-[minmax(0,1fr)_36px] bg-background" aria-label="퍼온 작품">
    <div className="min-h-0 overflow-hidden">
      {artifact ? artifact.type === 'image' && artifact.fileUrl
        ? <img src={artifact.fileUrl} alt={artifact.title} className="size-full object-contain" />
        : <PreviewRenderer artifact={artifact} playing expanded />
        : <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center" role="status">
          <p>{query.isError ? '공개된 작품을 불러올 수 없습니다.' : '작품을 불러오는 중…'}</p>
          {query.isError && <Button variant="outline" onClick={() => void query.refetch()}>다시 불러오기</Button>}
        </div>}
    </div>
    <footer className="flex min-w-0 items-center justify-between gap-3 border-t px-3 text-xs">
      <span className="truncate">{artifact?.title ?? 'COAI'}</span>
      <a href={artifactShareUrl('', id, artifact?.type === 'game')} target="_blank" rel="noopener noreferrer" className="shrink-0 underline">COAI에서 보기 ↗</a>
    </footer>
  </main>;
}
