// frames=150 size=1280x720
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {FONT} from './font';

const GOLD = '#FFC93C';
const FAMILY = 'MyPretendard'; // 내가 정하는 이름 (CSS fontFamily에 이 이름을 써요)
const BASE = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2';

// 굵기마다 파일이 따로 있어요 → 같은 family 이름 + 다른 weight로 여러 번 loadFont
const WEIGHTS = [
  {weight: 100, file: 'Thin'},
  {weight: 300, file: 'Light'},
  {weight: 400, file: 'Regular'},
  {weight: 700, file: 'Bold'},
  {weight: 900, file: 'Black'},
];
// 모듈 맨 위에서 한 번만 호출! (렌더는 폰트가 다 받아질 때까지 자동으로 기다려요)
WEIGHTS.forEach(({weight, file}) => {
  loadFont({family: FAMILY, url: `${BASE}/Pretendard-${file}.woff2`, weight: String(weight), format: 'woff2'});
});

const SceneBody = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center', paddingTop: 36}}>
      <div style={{color: '#fff', fontSize: 40, fontWeight: 800}}>@remotion/fonts</div>
      <div style={{color: GOLD, fontSize: 22, fontFamily: 'monospace', marginTop: 10}}>
        {`loadFont({family: '${FAMILY}', url: '…/Pretendard-Black.woff2', weight: '900'})`}
      </div>
      <div style={{marginTop: 30, display: 'flex', flexDirection: 'column', gap: 14, width: 1100}}>
        {WEIGHTS.map(({weight, file}, i) => {
          // 한 줄씩 왼쪽에서 들어오기
          const x = interpolate(f, [i * 10, i * 10 + 20], [-60, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const opacity = interpolate(f, [i * 10, i * 10 + 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <div key={weight} style={{display: 'flex', alignItems: 'baseline', gap: 30, transform: `translateX(${x}px)`, opacity}}>
              <div style={{width: 190, color: GOLD, fontSize: 26, fontWeight: 800}}>{`${weight} ${file}`}</div>
              <div style={{fontFamily: FAMILY, fontWeight: weight, color: '#fff', fontSize: 60}}>AI 영상 자동화 강의</div>
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
