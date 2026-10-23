type AudioWindow = Window & { wardAudio?: { hold(): void; dispose(): void } };

/** Stop audio in this turn; a hidden game may never process another animation frame. */
export function pauseGodotFrame(frame: HTMLIFrameElement | null, gameId: string, origin: string, targetWindow = frame?.contentWindow) {
  const target = targetWindow as AudioWindow | null;
  if (!target) return;
  try { target.wardAudio?.hold(); } catch { /* Navigation can replace a same-origin frame. */ }
  try { target.postMessage({ type: 'game-command', gameId, contractVersion: 1, command: 'pause', reason: 'focus' }, origin); } catch { /* Already detached. */ }
}

/** Navigation is a fallback for older game documents and frees their WebGL/audio runtime. */
export function disposeGodotFrame(frame: HTMLIFrameElement | null, gameId: string, origin: string, source = frame?.getAttribute('src'), targetWindow = frame?.contentWindow) {
  if (!frame || frame.getAttribute('src') !== source || source === 'about:blank') return;
  const target = targetWindow as AudioWindow | null;
  try { target?.wardAudio?.dispose(); } catch { /* Already navigating. */ }
  try { target?.postMessage({ type: 'game-command', gameId, contractVersion: 1, command: 'dispose' }, origin); } catch { /* Already detached. */ }
  frame.src = 'about:blank';
}
