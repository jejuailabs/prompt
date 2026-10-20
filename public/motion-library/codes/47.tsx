// frames=180 size=1280x720
import {AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {outline} from '@remotion/effects/outline';
import {dropShadow} from '@remotion/effects/drop-shadow';
import {glow} from '@remotion/effects/glow';
import {scale} from '@remotion/effects/scale';
import {FONT} from './font';

const GOLD = '#FFC93C';
const CHAR = 'https://www.aicitybuilders.com/video/remotion/assets/jay_char.png'; // 400×694, 배경 투명 PNG
const W = 270; // effects를 쓰는 <Img>는 width/height를 "숫자"로!
const H = Math.round((W * 694) / 400);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const grow = interpolate(f, [20, 50], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)}); // 효과가 서서히 켜져요

  // 카드 3장: 이름 · 설명 · 배경 · 효과 배열 (효과는 배열 순서대로 겹쳐 적용)
  // scale(0.9)을 먼저 걸면 캐릭터가 살짝 작아져서 테두리·그림자가 그려질 여백이 생겨요
  const CARDS = [
    {api: 'outline()', ko: '흰 테두리 스티커', bg: 'linear-gradient(160deg, #7cf3c8, #2bb3a3)',
      fx: [scale({scale: 0.9}), outline({width: 1 + 11 * grow, color: '#ffffff'})]},
    {api: 'dropShadow()', ko: '바닥에 떨어지는 그림자', bg: 'linear-gradient(160deg, #f4f1ea, #cfd8ee)',
      fx: [scale({scale: 0.9}), dropShadow({radius: 14, offsetX: 16 * Math.cos(t * 1.2) * grow, offsetY: 16 * grow, opacity: 0.55 * grow})]},
    {api: 'glow()', ko: '금빛 후광', bg: 'radial-gradient(circle at 50% 40%, #1d2f66, #070c1f)',
      // 뒤: 금색 실루엣(outlineOnly)에 glow → 후광 / 앞: 원래 캐릭터를 겹쳐서 얼굴은 그대로
      fx: [scale({scale: 0.9}), outline({width: 3, color: '#ff9a1f', outlineOnly: true}), glow({radius: 44, intensity: (0.6 + 0.3 * Math.sin(t * 2.4)) * grow, color: '#ffb347'})],
      front: true},
  ];

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: '#fff', background: '#050914'}}>
      <div style={{position: 'absolute', top: 24, width: '100%', textAlign: 'center', fontSize: 36, fontWeight: 900}}>
        스티커 효과 <span style={{color: GOLD}}>{'<Img effects={[ … ]} width={270} height={469} />'}</span>
      </div>

      <div style={{position: 'absolute', top: 88, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 56}}>
        {CARDS.map((c, i) => {
          const pop = spring({frame: f - i * 6, fps, config: {damping: 15}});
          return (
            <div key={c.api} style={{width: 320, opacity: pop, transform: `translateY(${(1 - pop) * 60}px)`}}>
              {/* 패널 아래 모서리로 PNG의 허리 잘린 부분을 가려요 (overflow: hidden) */}
              <div style={{width: 320, height: 440, borderRadius: 26, overflow: 'hidden', position: 'relative', background: c.bg,
                boxShadow: '0 18px 40px rgba(0,0,0,0.45)'}}>
                <Img src={CHAR} width={W} height={H} effects={c.fx}
                  style={{position: 'absolute', left: (320 - W) / 2, top: 440 - H + 30 + Math.sin(t * 1.6 + i) * 4, width: W, height: H}} />
                {c.front && (
                  <Img src={CHAR} style={{position: 'absolute', left: (320 - W) / 2, top: 440 - H + 30 + Math.sin(t * 1.6 + i) * 4, width: W, height: H, transform: 'scale(0.9)'}} />
                )}
              </div>
              <div style={{marginTop: 14, textAlign: 'center'}}>
                <div style={{fontSize: 32, fontWeight: 900, color: GOLD}}>{c.api}</div>
                <div style={{fontSize: 23, fontWeight: 700, opacity: 0.9, marginTop: 2}}>{c.ko}</div>
              </div>
            </div>
          );
        })}
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
