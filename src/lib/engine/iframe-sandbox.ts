'use client';
import type { ExecutableArtifact, ExecutionHandle, IExecutionEngine, RunOptions } from '@/lib/engine/types';

/** Tier 1 adapter. Each mount owns its frame, including simultaneous previews of one artifact. */
export class IframeSandboxEngine implements IExecutionEngine {
  id = 'iframe' as const;
  supports(type: string) { return ['game', 'app', 'landing_page'].includes(type); }
  private create(artifact: ExecutableArtifact, opts?: RunOptions) {
    if (!artifact.contentUrl || !/^(https?:\/\/|\/[^/])/.test(artifact.contentUrl)) throw new Error('Artifact has no supported executable URL');
    const container = document.createElement('div');
    container.setAttribute('data-playlab-sandbox', artifact.id);
    container.style.width = '100%'; container.style.height = '100%';
    const iframe = document.createElement('iframe');
    iframe.title = 'PLAYLAB interactive work';
    iframe.src = artifact.contentUrl;
    iframe.setAttribute('sandbox', 'allow-scripts allow-pointer-lock');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.allow = 'autoplay; fullscreen; gamepad';
    iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = '0';
    container.appendChild(iframe);
    let stopped = false;
    const handle: ExecutionHandle = { engineId: this.id, artifactId: artifact.id, stop: () => {
      if (stopped) return; stopped = true;
      iframe.src = 'about:blank'; container.remove(); opts?.onStopped?.();
    } };
    return { container, handle };
  }
  async run(artifact: ExecutableArtifact, opts?: RunOptions): Promise<ExecutionHandle> {
    const { handle } = this.create(artifact, opts); opts?.onStarted?.(); return handle;
  }
  async terminate(handle: ExecutionHandle) { handle.stop(); }
  mountInto(artifact: ExecutableArtifact, host: HTMLElement, opts?: RunOptions): ExecutionHandle {
    const { container, handle } = this.create(artifact, opts);
    host.appendChild(container); opts?.onStarted?.(); return handle;
  }
}
export const iframeSandboxEngine = new IframeSandboxEngine();
