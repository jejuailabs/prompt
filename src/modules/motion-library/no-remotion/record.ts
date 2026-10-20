// Frame-by-frame MP4 recorder for Motion Lite scenes.
// Each frame is drawn to the DOM, captured to a canvas (html-to-image), encoded as H.264 with
// WebCodecs and muxed into an MP4 in the browser. No server and no Remotion are involved.
import { toCanvas } from 'html-to-image';
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { fontReady, type VideoConfig } from './runtime';

export class RecordError extends Error {}

const CODECS = ['avc1.4d0028', 'avc1.42001f', 'avc1.640028'];

async function pickCodec(width: number, height: number, fps: number) {
  if (typeof window === 'undefined' || !('VideoEncoder' in window)) throw new RecordError('이 브라우저는 영상 인코딩(WebCodecs)을 지원하지 않아요. 최신 Chrome이나 Edge에서 다시 시도해 주세요.');
  for (const codec of CODECS) {
    const config = { codec, width, height, bitrate: 8_000_000, framerate: fps };
    const support = await VideoEncoder.isConfigSupported(config).catch(() => null);
    if (support?.supported) return config;
  }
  throw new RecordError('이 브라우저에서 H.264(MP4) 인코딩을 쓸 수 없어요. 최신 Chrome이나 Edge에서 다시 시도해 주세요.');
}

// ─── Fonts ──────────────────────────────────────────────────────────────────
// A captured frame is an SVG image, which cannot see the page's web fonts, so the fonts must be
// embedded as data URLs. Embedding whole Korean fonts (megabytes) in every frame is very slow,
// so only the @font-face pieces whose unicode-range covers characters on screen are embedded.
const fontCache = new Map<string, Promise<string>>();
function toDataUrl(url: string) {
  if (!fontCache.has(url)) fontCache.set(url, fetch(url).then(res => res.blob()).then(blob => new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
  })));
  return fontCache.get(url)!;
}
function coversAny(range: string, codes: Set<number>) {
  return range.split(',').some(part => {
    const [a, b = a] = part.trim().replace(/^u\+/i, '').split('-');
    if (a.includes('?')) return true;
    const lo = parseInt(a, 16), hi = parseInt(b, 16);
    for (const code of codes) if (code >= lo && code <= hi) return true;
    return false;
  });
}
const family = (value: string) => value.split(',').map(name => name.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);

async function buildFontCSS(node: HTMLElement, text: string) {
  const used = new Set<string>();
  for (const el of [node, ...node.querySelectorAll<HTMLElement>('*')]) family(getComputedStyle(el).fontFamily).forEach(name => used.add(name));
  const codes = new Set([...text].map(ch => ch.codePointAt(0)!));
  for (let c = 0x20; c < 0x7f; c++) codes.add(c);
  const faces: Promise<string>[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      if (!family(rule.style.getPropertyValue('font-family')).some(name => used.has(name))) continue;
      const range = rule.style.getPropertyValue('unicode-range');
      if (range && !coversAny(range, codes)) continue;
      const match = rule.style.getPropertyValue('src').match(/url\(["']?([^"')]+)["']?\)/);
      if (!match) continue;
      const url = new URL(match[1], sheet.href ?? location.href).href;
      faces.push(toDataUrl(url).then(data => rule.cssText.replace(/src:[^;]+;/, `src: url("${data}");`)).catch(() => ''));
    }
  }
  return (await Promise.all(faces)).join('\n');
}

/**
 * Records `durationInFrames` frames. `showFrame(i)` must synchronously render frame i into `node`
 * (e.g. with flushSync). Resolves to an MP4 Blob.
 */
export async function recordMp4({ node, config, showFrame, onProgress, signal }: {
  node: HTMLElement; config: VideoConfig; showFrame: (frame: number) => void; onProgress?: (done: number, total: number) => void; signal?: AbortSignal;
}) {
  const { width, height, fps, durationInFrames } = config;
  const encoderConfig = await pickCodec(width, height, fps);

  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width, height, frameRate: fps }, fastStart: 'in-memory' });
  let failure: unknown = null;
  const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: error => { failure = error; } });
  encoder.configure(encoderConfig);

  await fontReady;
  // Sample the text on screen across the timeline to know which glyphs the video needs.
  let text = '';
  for (const f of [0, 0.25, 0.5, 0.75, 1].map(t => Math.min(durationInFrames - 1, Math.round(t * (durationInFrames - 1))))) { showFrame(f); text += node.innerText; }
  const fontEmbedCSS = await buildFontCSS(node, text);
  const capture = { width, height, canvasWidth: width, canvasHeight: height, pixelRatio: 1, skipAutoScale: true, fontEmbedCSS, style: { position: 'relative', left: '0', top: '0', transform: 'none' } };

  try {
    for (let frame = 0; frame < durationInFrames; frame++) {
      if (signal?.aborted) throw new RecordError('영상 만들기를 취소했어요.');
      if (failure) throw failure;
      showFrame(frame);
      if (frame === 0) await document.fonts.ready;
      const canvas = await toCanvas(node, capture);
      const videoFrame = new VideoFrame(canvas, { timestamp: Math.round((frame * 1e6) / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(videoFrame, { keyFrame: frame % (fps * 2) === 0 });
      videoFrame.close();
      while (encoder.encodeQueueSize > 4) await new Promise(resolve => setTimeout(resolve, 0));
      onProgress?.(frame + 1, durationInFrames);
    }
    await encoder.flush();
    if (failure) throw failure;
    muxer.finalize();
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
}
