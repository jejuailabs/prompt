// Execution Engine abstraction (docs/07) — UI never knows which engine runs behind.
import type { ExecutionTier } from '@/lib/types';
export type { ArtifactType, ExecutionTier } from '@/lib/types';

export interface ExecutionHandle {
  engineId: ExecutionTier;
  artifactId: string;
  stop: () => void;
}

export interface RunOptions {
  autoPlay?: boolean;
  onStarted?: () => void;
  onStopped?: () => void;
}

export interface ExecutableArtifact {
  id: string;
  type: string;
  contentUrl?: string | null;
  fileUrl?: string | null;
  executionTier?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface IExecutionEngine {
  id: ExecutionTier;
  supports(artifactType: string): boolean;
  run(artifact: ExecutableArtifact, opts?: RunOptions): Promise<ExecutionHandle>;
  terminate(handle: ExecutionHandle): Promise<void>;
}

// ─── ExecutionEngineRouter (docs/07) ───
// Tier selection is metadata-driven, no hardcoded phase checks.
export function selectExecutionTier(artifact: ExecutableArtifact): ExecutionTier | null {
  if (artifact.type === 'game' || artifact.type === 'app') {
    if (artifact.metadata && (artifact.metadata as Record<string, unknown>).requiresServer === true) return 'microvm';
    return (artifact.executionTier as ExecutionTier) ?? 'iframe';
  }
  if (artifact.executionTier) return artifact.executionTier as ExecutionTier;
  return null;
}
