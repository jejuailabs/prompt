'use client';
// Motion Lite — a small, Remotion-free frame runtime.
// It implements the parts of the `remotion` API the motion examples use, so a scene can be
// played in an ordinary web page and recorded frame by frame without installing Remotion.
// Same names and arguments as Remotion: change `from 'remotion'` (and `from './font'`) to this file.
import { Children, createContext, isValidElement, useContext, useMemo, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from 'react';

// ─── Timeline ───────────────────────────────────────────────────────────────
export interface VideoConfig { id: string; width: number; height: number; fps: number; durationInFrames: number }
interface Timeline { frame: number; config: VideoConfig }
const DEFAULT_CONFIG: VideoConfig = { id: 'Scene', width: 1280, height: 720, fps: 30, durationInFrames: 180 };
const TimelineContext = createContext<Timeline>({ frame: 0, config: DEFAULT_CONFIG });

/** Wraps a scene and tells it which frame to draw. The player or the recorder owns `frame`. */
export function TimelineProvider({ frame, config, children }: { frame: number; config: VideoConfig; children: ReactNode }) {
  const value = useMemo(() => ({ frame, config }), [frame, config]);
  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}
export const useCurrentFrame = () => useContext(TimelineContext).frame;
export const useVideoConfig = () => useContext(TimelineContext).config;

function Shift({ frame, durationInFrames, children }: { frame: number; durationInFrames?: number; children: ReactNode }) {
  const { config } = useContext(TimelineContext);
  const value = useMemo(() => ({ frame, config: durationInFrames ? { ...config, durationInFrames } : config }), [frame, config, durationInFrames]);
  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}

// ─── Layout ─────────────────────────────────────────────────────────────────
const FILL: CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' };
export function AbsoluteFill({ style, children, className }: { style?: CSSProperties; children?: ReactNode; className?: string }) {
  return <div className={className} style={{ ...FILL, ...style }}>{children}</div>;
}
export function Img(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img alt="" crossOrigin="anonymous" decoding="sync" {...props} />;
}

type Layout = 'absolute-fill' | 'none';
interface SequenceProps { from?: number; durationInFrames?: number; layout?: Layout; style?: CSSProperties; name?: string; children?: ReactNode }
/** Shows children only between `from` and `from + durationInFrames`; inside, frames count from 0. */
export function Sequence({ from = 0, durationInFrames = Infinity, layout = 'absolute-fill', style, children }: SequenceProps) {
  const frame = useCurrentFrame();
  if (frame < from || frame >= from + durationInFrames) return null;
  const inner = <Shift frame={frame - from} durationInFrames={Number.isFinite(durationInFrames) ? durationInFrames : undefined}>{children}</Shift>;
  return layout === 'none' ? inner : <AbsoluteFill style={style}>{inner}</AbsoluteFill>;
}

/** Repeats children every `durationInFrames` frames. */
export function Loop({ durationInFrames, times = Infinity, layout = 'absolute-fill', style, children }: { durationInFrames: number; times?: number; layout?: Layout; style?: CSSProperties; name?: string; children?: ReactNode }) {
  const frame = useCurrentFrame();
  if (frame < 0 || frame >= durationInFrames * times) return null;
  const inner = <Shift frame={frame % durationInFrames} durationInFrames={durationInFrames}>{children}</Shift>;
  return layout === 'none' ? inner : <AbsoluteFill style={style}>{inner}</AbsoluteFill>;
}

/** Holds children on one frame. */
export function Freeze({ frame, active = true, children }: { frame: number; active?: boolean | ((f: number) => boolean); children?: ReactNode }) {
  const current = useCurrentFrame();
  const on = typeof active === 'function' ? active(current) : active;
  return on ? <Shift frame={frame}>{children}</Shift> : <>{children}</>;
}

interface SeriesSequenceProps { durationInFrames: number; offset?: number; layout?: Layout; style?: CSSProperties; name?: string; children?: ReactNode }
function SeriesSequence({ children }: SeriesSequenceProps) { return <>{children}</>; }
/** Plays its `<Series.Sequence>` children one after another. */
export function Series({ children }: { children?: ReactNode }) {
  const parts = Children.toArray(children).filter(isValidElement).map(child => child.props as SeriesSequenceProps);
  const starts = parts.reduce<number[]>((acc, part, i) => [...acc, (i ? acc[i - 1] + parts[i - 1].durationInFrames : 0) + (part.offset ?? 0)], []);
  return <>{parts.map(({ durationInFrames, layout, style, children: inner }, index) =>
    <Sequence key={index} from={starts[index]} durationInFrames={durationInFrames} layout={layout} style={style}>{inner}</Sequence>)}</>;
}
Series.Sequence = SeriesSequence;

// ─── Math ───────────────────────────────────────────────────────────────────
type Extrapolate = 'extend' | 'clamp' | 'identity' | 'wrap';
export interface InterpolateOptions { easing?: (t: number) => number; extrapolateLeft?: Extrapolate; extrapolateRight?: Extrapolate }

function segment(input: number, [i0, i1]: [number, number], [o0, o1]: [number, number], opts: InterpolateOptions) {
  const { easing = (t: number) => t, extrapolateLeft = 'extend', extrapolateRight = 'extend' } = opts;
  let x = input;
  if (x < i0) {
    if (extrapolateLeft === 'identity') return x;
    if (extrapolateLeft === 'clamp') x = i0;
    if (extrapolateLeft === 'wrap') x = i0 + ((((x - i0) % (i1 - i0)) + (i1 - i0)) % (i1 - i0));
  }
  if (x > i1) {
    if (extrapolateRight === 'identity') return x;
    if (extrapolateRight === 'clamp') x = i1;
    if (extrapolateRight === 'wrap') x = i0 + ((x - i0) % (i1 - i0));
  }
  if (o0 === o1) return o0;
  const t = i1 === i0 ? (x > i0 ? 1 : 0) : (x - i0) / (i1 - i0);
  return o0 + easing(t) * (o1 - o0);
}

/** Maps `input` from `inputRange` to `outputRange` (Remotion-compatible). */
export function interpolate(input: number, inputRange: readonly number[], outputRange: readonly number[], options: InterpolateOptions = {}) {
  if (inputRange.length !== outputRange.length || inputRange.length < 2) throw new Error('interpolate: inputRange and outputRange need the same length (2 or more)');
  let i = 1;
  while (i < inputRange.length - 1 && input >= inputRange[i]) i++;
  // Only the first and last segments extrapolate; inner segments always extend.
  return segment(input, [inputRange[i - 1], inputRange[i]], [outputRange[i - 1], outputRange[i]], {
    ...options,
    extrapolateLeft: i > 1 ? 'extend' : options.extrapolateLeft,
    extrapolateRight: i < inputRange.length - 1 ? 'extend' : options.extrapolateRight,
  });
}

// Colors
type RGBA = [number, number, number, number];
function parseColor(color: string): RGBA {
  const c = color.trim();
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map(ch => ch + ch).join('');
    const n = (s: number) => parseInt(hex.slice(s, s + 2), 16);
    return [n(0), n(2), n(4), hex.length === 8 ? n(6) / 255 : 1];
  }
  const m = c.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b, a = '1'] = m[1].split(/[\s,/]+/).filter(Boolean);
    return [parseFloat(r), parseFloat(g), parseFloat(b), parseFloat(a)];
  }
  if (c === 'transparent') return [0, 0, 0, 0];
  throw new Error('interpolateColors: unsupported color ' + color);
}
/** Blends colors over `inputRange` (hex, rgb() and rgba() colors). */
export function interpolateColors(input: number, inputRange: readonly number[], outputRange: readonly string[]) {
  const colors = outputRange.map(parseColor);
  const channel = (k: number) => interpolate(input, inputRange, colors.map(c => c[k]), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const [r, g, b, a] = [0, 1, 2, 3].map(channel);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.round(a * 1000) / 1000})`;
}

/** Deterministic pseudo-random number in [0, 1) for a seed (same seed → same value every frame). */
export function random(seed: number | string | null) {
  if (seed === null) return Math.random();
  let h = 1779033703 ^ String(seed).length;
  for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let t = (h ^ (h >>> 16)) >>> 0;
  t += 0x6d2b79f5;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
}

// Spring physics (damped harmonic oscillator, stepped once per frame like Remotion)
export interface SpringConfig { damping: number; mass: number; stiffness: number; overshootClamping: boolean }
const SPRING_DEFAULT: SpringConfig = { damping: 10, mass: 1, stiffness: 100, overshootClamping: false };
interface SpringState { current: number; velocity: number; lastTimestamp: number }

function advance(state: SpringState, now: number, toValue: number, { damping: c, mass: m, stiffness: k }: SpringConfig): SpringState {
  const dt = Math.min(now - state.lastTimestamp, 64) / 1000;
  const v0 = -state.velocity, x0 = toValue - state.current;
  const zeta = c / (2 * Math.sqrt(k * m)), omega0 = Math.sqrt(k / m);
  if (zeta < 1) {
    const omega1 = omega0 * Math.sqrt(1 - zeta * zeta);
    const env = Math.exp(-zeta * omega0 * dt), sin = Math.sin(omega1 * dt), cos = Math.cos(omega1 * dt);
    const frag = env * (sin * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos);
    return { current: toValue - frag, velocity: zeta * omega0 * frag - env * (cos * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin), lastTimestamp: now };
  }
  const env = Math.exp(-omega0 * dt);
  return { current: toValue - env * (x0 + (v0 + omega0 * x0) * dt), velocity: env * (v0 * (dt * omega0 - 1) + dt * x0 * omega0 * omega0), lastTimestamp: now };
}
function springAt(frame: number, fps: number, config: SpringConfig) {
  let state: SpringState = { current: 0, velocity: 0, lastTimestamp: 0 };
  const f = Math.max(0, frame), whole = Math.floor(f), rest = f % 1;
  for (let i = 0; i <= whole; i++) state = advance(state, ((i === whole ? i + rest : i) / fps) * 1000, 1, config);
  return state.current;
}
function settleFrame(fps: number, config: SpringConfig) {
  for (let f = 0; f < fps * 60; f++) {
    let settled = true;
    for (let j = 0; j < 20 && settled; j++) if (Math.abs(springAt(f + j, fps, config) - 1) > 0.002) settled = false;
    if (settled) return f;
  }
  return fps * 60;
}

/** Remotion-compatible spring: 0 → 1 (or `from` → `to`) with physics, driven by `frame`. */
export function spring({ frame, fps, config = {}, from = 0, to = 1, durationInFrames, delay = 0, reverse = false, durationRestThreshold }: {
  frame: number; fps: number; config?: Partial<SpringConfig>; from?: number; to?: number; durationInFrames?: number; delay?: number; reverse?: boolean; durationRestThreshold?: number;
}) {
  const cfg = { ...SPRING_DEFAULT, ...config };
  let f = frame - delay;
  if (durationInFrames) {
    const natural = settleFrame(fps, cfg);
    if (reverse) f = durationInFrames - f;
    f = (f / durationInFrames) * natural;
  } else if (reverse) {
    f = settleFrame(fps, cfg) - f;
  }
  let progress = f < 0 ? 0 : springAt(f, fps, cfg);
  if (cfg.overshootClamping) progress = Math.min(progress, 1);
  return from + progress * (to - from);
}

// Easing (same API as Remotion / React Native)
type Fn = (t: number) => number;
function bezier(x1: number, y1: number, x2: number, y2: number): Fn {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-6) return sy(t); const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1; t = x;
    while (hi - lo > 1e-6) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}
export const Easing = {
  linear: (t: number) => t,
  ease: bezier(0.42, 0, 1, 1),
  quad: (t: number) => t * t,
  cubic: (t: number) => t * t * t,
  poly: (n: number): Fn => t => Math.pow(t, n),
  sin: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  circle: (t: number) => 1 - Math.sqrt(1 - t * t),
  exp: (t: number) => Math.pow(2, 10 * (t - 1)),
  elastic: (bounciness = 1): Fn => { const p = bounciness * Math.PI; return t => 1 - Math.pow(Math.cos((t * Math.PI) / 2), 3) * Math.cos(t * p); },
  back: (s = 1.70158): Fn => t => t * t * ((s + 1) * t - s),
  bounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { const u = t - 1.5 / 2.75; return 7.5625 * u * u + 0.75; }
    if (t < 2.5 / 2.75) { const u = t - 2.25 / 2.75; return 7.5625 * u * u + 0.9375; }
    const u = t - 2.625 / 2.75; return 7.5625 * u * u + 0.984375;
  },
  bezier,
  in: (fn: Fn): Fn => fn,
  out: (fn: Fn): Fn => t => 1 - fn(1 - t),
  inOut: (fn: Fn): Fn => t => (t < 0.5 ? fn(t * 2) / 2 : 1 - fn((1 - t) * 2) / 2),
};

// ─── Fonts ──────────────────────────────────────────────────────────────────
// Replaces the examples' `./font` file (which used @remotion/fonts).
export const FONT = 'Pretendard';
// Pretendard is split into ~90 small unicode-range pieces, so a page (and a recorded frame)
// only downloads the pieces for the characters it actually shows.
const FONT_CSS = 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
export const fontReady: Promise<void> = typeof document === 'undefined' || document.querySelector('style[data-motion-lite-font]')
  ? Promise.resolve()
  : fetch(FONT_CSS).then(res => res.text()).then(css => {
    const base = FONT_CSS.slice(0, FONT_CSS.lastIndexOf('/') + 1);
    const style = document.createElement('style');
    style.dataset.motionLiteFont = '';
    style.textContent = css
      .replace(/font-family:\s*'Pretendard Variable'/g, `font-family:'${FONT}'`)
      .replace(/font-display:\s*swap/g, 'font-display:block')
      .replace(/url\((?!['"]?(?:https?:|data:))['"]?([^'")]+)['"]?\)/g, (_m, path) => `url(${base}${path})`);
    document.head.append(style);
  }).catch(() => undefined);

function addStylesheet(href: string) {
  if (typeof document === 'undefined' || document.querySelector(`link[data-motion-lite="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = href; link.crossOrigin = 'anonymous'; link.dataset.motionLite = href;
  document.head.append(link);
}

/** Stand-in for `@remotion/google-fonts/<Font>`: `googleFont('Jua').loadFont()` returns `{fontFamily}`. */
export function googleFont(family: string) {
  return {
    // The Google Fonts stylesheet already splits Korean fonts by unicode-range, and the browser
    // downloads only the pieces a page uses, so no subset list is needed here.
    getInfo: () => ({ fontFamily: family, unicodeRanges: {} as Record<string, string> }),
    loadFont: (_style: 'normal' = 'normal', options: { weights?: string[]; subsets?: string[] } = {}) => {
      const weights = options.weights?.length ? `:wght@${[...options.weights].sort().join(';')}` : '';
      addStylesheet(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}${weights}&display=block`);
      return { fontFamily: `'${family}'` };
    },
  };
}
