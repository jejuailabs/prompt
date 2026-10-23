/* Stop Web Audio immediately, even when a background tab has no Godot frames. */
(() => {
  'use strict';
  const contexts = new Map();
  let engaged = false, held = false, paused = false, muted = false, disposed = false;
  const blocked = () => disposed || !engaged || held || paused || muted || document.hidden ||
    (typeof document.hasFocus === 'function' && !document.hasFocus());
  function quiet(promise) { promise?.catch(() => {}); }
  function apply() {
    for (const [context, native] of contexts) {
      if (context.state === 'closed') continue;
      if (disposed) quiet(native.close());
      else if (blocked()) { if (context.state !== 'suspended' || native.resuming) quiet(native.suspend()); }
      else if (context.state !== 'running') {
        native.resuming = true;
        quiet(native.resume().finally(() => { native.resuming = false; if (blocked()) apply(); }));
      }
    }
  }
  function track(context) {
    if (contexts.has(context)) return context;
    const native = {resume:context.resume.bind(context), suspend:context.suspend.bind(context), close:context.close.bind(context), resuming:false};
    contexts.set(context, native);
    // Godot's own focus/touch listeners cannot undo a background/mute hold.
    context.resume = () => blocked() ? Promise.resolve() : native.resume();
    context.addEventListener('statechange', () => {
      if ((disposed || blocked()) && context.state === 'running') apply();
    });
    apply();
    return context;
  }
  for (const name of ['AudioContext','webkitAudioContext']) {
    const Native = window[name];
    if (typeof Native !== 'function') continue;
    window[name] = new Proxy(Native, {construct(target,args,newTarget) { return track(Reflect.construct(target,args,newTarget)); }});
  }
  window.wardAudio = {
    hold() { held = true; apply(); },
    intent() { if (disposed) return; engaged = true; held = false; apply(); },
    sync(state) { paused = state.mode === 'paused'; muted = Boolean(state.muted); apply(); },
    dispose() { disposed = true; held = true; apply(); },
    snapshot() { return {blocked:blocked(), disposed, contexts:[...contexts.keys()].map(context=>context.state)}; },
  };
})();
