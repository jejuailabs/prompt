// frames=180 size=1280x720
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D, noise3D} from '@remotion/noise';
import {FONT} from './font';

const GOLD = '#FFC93C';

// 공통 라벨: 위에는 API 이름, 아래에는 설명
const Label = ({api, ko}: {api: string; ko: string}) => (
  <div style={{textAlign: 'center', marginTop: 24}}>
    <div style={{color: GOLD, fontSize: 30, fontWeight: 900}}>{api}</div>
    <div style={{color: '#fff', fontSize: 22, marginTop: 6}}>{ko}</div>
  </div>
);

const SceneBody = () => {
  const f = useCurrentFrame();
  const t = f / 30; // 초 단위 시간

  // 1) noise2D(시드, x, y) → -1~1 사이의 "부드러운" 랜덤 값
  //    시간(t)을 x에 넣으면 매 프레임 조금씩만 변해서 손떨림처럼 보여요
  const shakeX = noise2D('x', t * 1.5, 0) * 14;
  const shakeY = noise2D('y', t * 1.5, 0) * 10;
  const shakeR = noise2D('r', t * 1.0, 0) * 2;

  // 2) noise3D로 원 둘레의 점 64개를 밀고 당겨서 꿀렁이는 블롭 만들기
  const N = 64;
  const blob = Array.from({length: N}, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    // (cos, sin) = 둘레 위치, 세 번째 축 = 시간 → 모양이 계속 바뀜
    const r = 110 + noise3D('blob', Math.cos(a), Math.sin(a), t * 0.6) * 35;
    return `${i === 0 ? 'M' : 'L'} ${Math.cos(a) * r} ${Math.sin(a) * r}`;
  }).join(' ') + ' Z';

  // 3) 흐름장(flow field): 격자 칸마다 noise로 각도를 정해 짧은 선을 그려요
  const cells = [];
  for (let gx = 0; gx < 9; gx++) {
    for (let gy = 0; gy < 9; gy++) {
      const angle = noise3D('flow', gx * 0.09, gy * 0.09, t * 0.3) * Math.PI;
      const x = 20 + gx * 30, y = 20 + gy * 30;
      cells.push(
        <line key={`${gx}-${gy}`} x1={x} y1={y} x2={x + Math.cos(angle) * 13} y2={y + Math.sin(angle) * 13}
          stroke={GOLD} strokeWidth={3} strokeLinecap="round" opacity={0.85} />,
      );
    }
  }

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 40}}>
      <div style={{position: 'absolute', top: 40, width: '100%', textAlign: 'center', color: '#fff', fontSize: 40, fontWeight: 900}}>@remotion/noise</div>
      {/* 1. 핸드헬드 카메라 흔들림 */}
      <div style={{width: 340, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{width: 300, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{
            width: 260, height: 180, borderRadius: 20, background: 'linear-gradient(135deg,#1d3a7a,#0e1a3a)', border: `3px solid ${GOLD}`,
            color: '#fff', fontSize: 34, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `translate(${shakeX}px, ${shakeY}px) rotate(${shakeR}deg)`,
          }}>
            손떨림 카메라
          </div>
        </div>
        <Label api="noise2D()" ko="카드가 자연스럽게 흔들려요" />
      </div>

      {/* 2. 꿀렁이는 블롭 */}
      <div style={{width: 340, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <svg width={300} height={280} viewBox="-150 -140 300 280">
          <path d={blob} fill={GOLD} opacity={0.9} />
        </svg>
        <Label api="noise3D()" ko="원 둘레를 노이즈로 밀어 블롭" />
      </div>

      {/* 3. 흐름장 */}
      <div style={{width: 340, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <svg width={280} height={280} viewBox="0 0 280 280">{cells}</svg>
        <Label api="noise3D() 흐름장" ko="칸마다 방향이 천천히 바뀌어요" />
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
