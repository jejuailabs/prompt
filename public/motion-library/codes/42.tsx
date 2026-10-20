// frames=180 size=1280x720
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {Heart} from '@remotion/shapes';
import {FONT} from './font';

const GOLD = '#FFC93C';
const CHAR = 'https://www.aicitybuilders.com/video/remotion/assets/jay_char.png'; // 400×694, 배경 투명 PNG
const CW = 360;
const CH = Math.round((CW * 694) / 400);
const X = 700; // 캐릭터 가운데 x
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// 머리 위에 차례로 뜨는 감정 표시: 시작 프레임 + 모양
const MARKS = [
  {from: 15, kind: '!'},
  {from: 70, kind: '?'},
  {from: 125, kind: '♥'},
];

const Mark = ({kind}: {kind: string}) =>
  kind === '♥' ? (
    <Heart width={96} height={88} fill="#ff5d7a" stroke="#fff" strokeWidth={6} />
  ) : (
    <svg width={96} height={112} viewBox="0 0 70 84">
      <text x={35} y={70} textAnchor="middle" fontSize={84} fontWeight={900} fontFamily={FONT}
        fill={kind === '!' ? GOLD : '#7cf3c8'} stroke="#fff" strokeWidth={4} paintOrder="stroke">{kind}</text>
    </svg>
  );

const LABELS = [
  ['숨쉬기', 'Math.sin() → scaleY'],
  ['살랑 흔들기', "rotate + transformOrigin: 'bottom'"],
  ['둥실 떠 있기', 'noise2D() → translateY'],
  ['감정 표시', '<Heart /> + spring()'],
];

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  // 1) 숨쉬기: 3초에 한 번, 세로로 1.2%만 늘었다 줄었다 (아주 작게 줘야 자연스러워요)
  const breathe = 1 + 0.012 * Math.sin((t / 3) * Math.PI * 2);
  // 2) 흔들기: 발밑을 축으로 ±1.6도 기울기
  const tilt = 1.6 * Math.sin((t / 4) * Math.PI * 2);
  // 3) 둥실: noise2D는 -1~1의 부드러운 랜덤 값 → 위아래로 천천히
  const floatY = noise2D('float', t * 0.35, 0) * 12;

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: '#fff', overflow: 'hidden',
      background: 'radial-gradient(ellipse 45% 75% at 55% 60%, #1d2f5c 0%, #0b1430 50%, #050914 100%)'}}>
      <div style={{position: 'absolute', top: 40, left: 60, fontSize: 42, fontWeight: 900}}>살아 있는 대기 동작</div>
      <div style={{position: 'absolute', top: 100, left: 60, fontSize: 24, opacity: 0.7}}>가만히 서 있어도 계속 조금씩 움직여요</div>

      {/* 왼쪽: 지금 쓰는 API 목록 */}
      <div style={{position: 'absolute', left: 60, top: 190, display: 'flex', flexDirection: 'column', gap: 26}}>
        {LABELS.map(([ko, api], i) => {
          const show = interpolate(f, [5 + i * 8, 20 + i * 8], [0, 1], clamp);
          return (
            <div key={ko} style={{opacity: show, transform: `translateX(${(1 - show) * -30}px)`}}>
              <div style={{fontSize: 30, fontWeight: 900}}>{ko}</div>
              <div style={{fontSize: 23, fontWeight: 800, color: GOLD, marginTop: 4}}>{api}</div>
            </div>
          );
        })}
      </div>

      {/* 캐릭터: 아래쪽은 화면 밖으로 살짝 내려서 허리 잘린 부분을 숨겨요 */}
      <div style={{position: 'absolute', left: X - CW / 2, top: 720 - CH + 40, width: CW, height: CH, transformOrigin: '50% 100%',
        transform: `translateY(${floatY}px) rotate(${tilt}deg) scaleY(${breathe})`}}>
        <Img src={CHAR} style={{width: CW, height: CH}} />
      </div>

      {/* 감정 표시: 톡 튀어나와 → 위로 살짝 떠오르며 → 사라지기 */}
      {MARKS.map((m) => {
        const pop = spring({frame: f - m.from, fps, config: {damping: 10, mass: 0.6}});
        const out = interpolate(f, [m.from + 38, m.from + 50], [1, 0], clamp);
        const rise = interpolate(f, [m.from, m.from + 50], [0, -24], clamp);
        return (
          <div key={m.kind} style={{position: 'absolute', left: X + 110, top: 80 + floatY, opacity: out * Math.min(1, pop * 2),
            transform: `translateY(${rise}px) scale(${pop}) rotate(${12 - 12 * pop + 10}deg)`, transformOrigin: '50% 100%'}}>
            <Mark kind={m.kind} />
          </div>
        );
      })}
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
