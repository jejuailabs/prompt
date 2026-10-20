// frames=180 size=1280x720
import {AbsoluteFill, Sequence, Solid, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Starburst} from '@remotion/starburst';
import {starburst} from '@remotion/effects/starburst';
import {FONT} from './font';

const GOLD = '#FFC93C';
const W = 570;
const H = 400;

// 가운데 튀어나오는 강조 문구
const Pop = ({text, color}: {text: string; color: string}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 10, fps, config: {damping: 9}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{transform: `scale(${s})`, fontSize: 76, fontWeight: 900, color, textShadow: '0 6px 24px rgba(0,0,0,0.5)'}}>{text}</div>
    </AbsoluteFill>
  );
};

const Label = ({code, ko}: {code: string; ko: string}) => (
  <div style={{marginTop: 14}}>
    <div style={{fontSize: 26, fontWeight: 900, color: GOLD}}>{code}</div>
    <div style={{fontSize: 24, opacity: 0.85}}>{ko}</div>
  </div>
);

const SceneBody = () => {
  const f = useCurrentFrame();
  const rotation = f * 0.6; // 매 프레임 0.6도씩 천천히 회전
  const rays = Math.round(12 + 12 * Math.min(1, f / 90)); // 0~3초 동안 광선 12 → 24개

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, color: '#fff'}}>
      <div style={{position: 'absolute', top: 36, width: '100%', textAlign: 'center', fontSize: 44, fontWeight: 900}}>
        방사형 광선 배경 (스타버스트)
      </div>

      <div style={{position: 'absolute', top: 130, left: 50, right: 50, display: 'flex', justifyContent: 'space-between'}}>
        {/* 방법 1: <Starburst> 컴포넌트. 영상 크기로 그려지므로 Sequence에 width/height를 줘서 칸 크기에 맞춤 */}
        <div style={{width: W}}>
          <div style={{position: 'relative', width: W, height: H, borderRadius: 18, overflow: 'hidden'}}>
            <Sequence width={W} height={H}>
              <Starburst rays={rays} colors={[GOLD, '#f2a91b']} rotation={rotation} smoothness={0.2} vignette={0.5} />
            </Sequence>
            <Pop text="핵심 포인트!" color="#050914" />
          </div>
          <Label code={`<Starburst rays={${rays}} rotation={…} />`} ko="@remotion/starburst · 컴포넌트 방식" />
        </div>

        {/* 방법 2 (권장): <Solid>(단색 사각형)에 starburst() 이펙트 → 중심(origin)도 움직일 수 있음 */}
        <div style={{width: W}}>
          <div style={{position: 'relative', width: W, height: H, borderRadius: 18, overflow: 'hidden'}}>
            <Solid
              width={W}
              height={H}
              color="#050914"
              effects={[starburst({rays: 18, colors: ['#5B8CFF', '#13224d'], rotation: -rotation, smoothness: 0.4, origin: [0.5 + 0.2 * Math.sin(f / 25), 0.5]})]}
            />
            <Pop text="오늘의 정리" color={GOLD} />
          </div>
          <Label code="<Solid effects={[starburst({…})]} />" ko="@remotion/effects/starburst · 이펙트 방식 (권장)" />
        </div>
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
