'use client';

// Tier 1 engine — iframe sandbox + CSP (itch.io / CodePen approach, docs/07)
import type { ExecutableArtifact, ExecutionHandle, IExecutionEngine, RunOptions } from '@/lib/engine/types';

export class IframeSandboxEngine implements IExecutionEngine {
  id = 'iframe' as const;
  private handles = new Map<string, { iframe: HTMLIFrameElement; container: HTMLElement }>();

  supports(artifactType: string): boolean {
    return ['game', 'app', 'landing_page'].includes(artifactType);
  }

  async run(artifact: ExecutableArtifact, opts?: RunOptions): Promise<ExecutionHandle> {
    if (!artifact.contentUrl) throw new Error('Artifact has no executable contentUrl');
    const container = document.createElement('div');
    container.setAttribute('data-playlab-sandbox', artifact.id);
    const iframe = document.createElement('iframe');
    iframe.src = artifact.contentUrl;
    iframe.setAttribute('sandbox', 'allow-scripts allow-pointer-lock allow-popups');
    iframe.setAttribute(
      'referrerpolicy',
      'no-referrer'
    );
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.allow = 'autoplay; fullscreen; gamepad';
    container.appendChild(iframe);
    this.handles.set(artifact.id, { iframe, container });
    opts?.onStarted?.();
    return {
      engineId: this.id,
      artifactId: artifact.id,
      stop: () => {
        iframe.src = 'about:blank';
        container.remove();
        this.handles.delete(artifact.id);
        opts?.onStopped?.();
      },
    };
  }

  async terminate(handle: ExecutionHandle): Promise<void> {
    handle.stop();
  }

  /** Mount into a host element (used by PreviewRenderer) */
  mountInto(artifact: ExecutableArtifact, host: HTMLElement, opts?: RunOptions): ExecutionHandle {
    const handlePromise = this.run(artifact, opts);
    void handlePromise.then((handle) => {
      const h = this.handles.get(artifact.id);
      if (h) host.appendChild(h.container);
      return handle;
    });
    // Simplified synchronous handle for mounting; stop() cleans up when engine finishes async mount
    return {
      engineId: this.id,
      artifactId: artifact.id,
      stop: () => {
        void handlePromise.then((handle) => handle.stop());
      },
    };
  }
}

export const iframeSandboxEngine = new IframeSandboxEngine();
