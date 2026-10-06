'use client';
import { useEffect, useRef } from 'react';
import { iframeSandboxEngine } from '@/lib/engine/iframe-sandbox';
import { selectExecutionTier } from '@/lib/engine/types';
import type { ArtifactDTO } from '@/lib/types';

export function ExecutablePreview({ artifact }: { artifact: ArtifactDTO }) {
  const host = useRef<HTMLDivElement>(null);
  const tier = selectExecutionTier({ ...artifact, metadata: { ...artifact.metadata } });
  useEffect(() => {
    if (!host.current || tier !== 'iframe') return;
    const handle = iframeSandboxEngine.mountInto({ ...artifact, metadata: { ...artifact.metadata } }, host.current);
    return () => handle.stop();
  }, [artifact, tier]);
  if (tier !== 'iframe') return <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">이 작품은 별도 실행 환경이 필요합니다.</div>;
  return <div ref={host} className="h-full w-full" />;
}
