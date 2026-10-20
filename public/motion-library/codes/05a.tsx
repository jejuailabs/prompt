// frames=150 size=1280x720
import {AbsoluteFill, Img, useCurrentFrame, useVideoConfig} from 'remotion';
import {glow} from '@remotion/effects/glow';
import {vignette} from '@remotion/effects/vignette';
import {chromaticAberration} from '@remotion/effects/chromatic-aberration';
import {pixelate} from '@remotion/effects/pixelate';
import {halftone} from '@remotion/effects/halftone';
import {duotone} from '@remotion/effects/duotone';
import {FONT} from './font';

const GOLD = '#FFC93C';
const PHOTO = 'https://www.aicitybuilders.com/video/remotion/assets/jay_photo.jpg'; // 제이 사진 (CONNECT AI LAB)
const W = 360; // effects를 쓰는 <Img>는 width/height를 "숫자"로 줘야 해요
const H = 203;

// s: 0 → 1 → 0 으로 오르내리는 값 (효과 세기를 애니메이션하는 데 사용)
const EFFECTS = [
  {name: 'glow()', ko: '빛 번짐', fx: (s: number) => [glow({radius: 8 + 40 * s, intensity: 0.4 + 2.6 * s, threshold: 0.3})]},
  {name: 'vignette()', ko: '가장자리 어둡게', fx: (s: number) => [vignette({amount: 0.95 * s, radius: 0.45, feather: 0.45})]},
  {name: 'chromaticAberration()', ko: '색수차 (RGB 분리)', fx: (s: number) => [chromaticAberration({amount: 18 * s})]},
  {name: 'pixelate()', ko: '모자이크', fx: (s: number) => [pixelate({blockSize: 1 + 22 * s})]},
  {name: 'halftone()', ko: '망점 (만화 인쇄)', fx: (s: number) => [halftone({dotSize: 4 + 8 * s, colorMode: 'source'})]},
  {name: 'duotone()', ko: '두 가지 색', fx: (s: number) => [duotone({darkColor: '#0b1a4a', lightColor: GOLD, threshold: 0.42 - 0.14 * s})]},
];

const SceneBody = () => {
  const f = useCurrentFrame();
  const s = 0.5 - 0.5 * Math.cos((2 * Math.PI * f) / 149); // 5초 동안 한 번 0→1→0

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, color: '#fff'}}>
      <div style={{position: 'absolute', top: 26, width: '100%', textAlign: 'center', fontSize: 40, fontWeight: 900}}>
        {'<Img effects={[효과()]} width={360} height={203} />'}
      </div>

      <div style={{position: 'absolute', top: 105, left: 55, width: 1170, display: 'flex', flexWrap: 'wrap', gap: '16px 45px'}}>
        {EFFECTS.map((e) => (
          <div key={e.name} style={{width: W}}>
            <div style={{width: W, height: H, borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(255,201,60,0.4)'}}>
              {/* effects 배열에 넣은 순서대로 GPU(WebGL)에서 차례로 적용됩니다 */}
              <Img src={PHOTO} width={W} height={H} effects={e.fx(s)} style={{width: W, height: H, objectFit: 'cover'}} />
            </div>
            <div style={{fontSize: 26, fontWeight: 900, color: GOLD, marginTop: 6}}>{e.name}</div>
            <div style={{fontSize: 22, opacity: 0.85}}>{e.ko}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── 채널 표시: CONNECT AI LAB (모든 예제 공통 · 오른쪽 아래) ──
const BrandMark = () => {
  const {width} = useVideoConfig();
  return (
    <div style={{position: 'absolute', right: Math.round(width * 0.02), bottom: Math.round(width * 0.015), fontFamily: FONT, fontWeight: 800,
      fontSize: Math.round(width / 60), letterSpacing: '0.16em', color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 6px rgba(0,0,0,0.6)'}}>
      CONNECT AI LAB
    </div>
  );
};

export const Scene = () => (
  <AbsoluteFill>
    <SceneBody />
    <BrandMark />
  </AbsoluteFill>
);
