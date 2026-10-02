import { ImageResponse } from 'next/og';

export const alt = 'PLAYLAB — vibe-coding all-in-one platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: 'linear-gradient(135deg, #1e1033 0%, #4c1d95 100%)', color: 'white' }}>
        <div style={{ fontSize: 40, opacity: 0.8 }}>PLAYLAB</div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 16, lineHeight: 1.1 }}>Vibe-coding, from idea to launch</div>
        <div style={{ fontSize: 32, marginTop: 28, opacity: 0.85 }}>Setup manual · Prompt wiki · AI pipelines</div>
      </div>
    ),
    size,
  );
}
