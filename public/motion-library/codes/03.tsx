// frames=180 size=1280x720
import {AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {LightLeak} from '@remotion/light-leaks';
import {lightLeak} from '@remotion/effects/light-leak';
import {FONT} from './font';

const GOLD = '#FFC93C';
const W = 560;
const H = 315;
const PHOTO = 'https://www.aicitybuilders.com/video/remotion/assets/jay_photo.jpg'; // 제이 사진 (CONNECT AI LAB)

// 빛을 얹을 "장면": CSS로 직접 그린 강의 타이틀 카드
const TitleCard = () => (
  <AbsoluteFill style={{background: 'linear-gradient(135deg, #13224d, #050914)', alignItems: 'center', justifyContent: 'center'}}>
    <div style={{fontSize: 30, color: '#cfd8f5'}}>AI 두뇌 만들기</div>
    <div style={{fontSize: 64, fontWeight: 900, color: GOLD}}>1강 · 시작</div>
  </AbsoluteFill>
);

const Label = ({code, ko}: {code: string; ko: string}) => (
  <div style={{marginTop: 14}}>
    <div style={{fontSize: 30, fontWeight: 900, color: GOLD}}>{code}</div>
    <div style={{fontSize: 24, opacity: 0.85}}>{ko}</div>
  </div>
);

const SceneBody = () => {
  const f = useCurrentFrame();
  // lightLeak() 이펙트는 progress(0→1)를 직접 줌: 0~0.5 빛이 번지고, 0.5~1 사라짐
  const progress = interpolate(f, [15, 165], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, color: '#fff'}}>
      <div style={{position: 'absolute', top: 36, width: '100%', textAlign: 'center', fontSize: 44, fontWeight: 900}}>
        빛 번짐(라이트 릭) 두 가지 방법
      </div>

      <div style={{position: 'absolute', top: 170, left: 50, right: 50, display: 'flex', justifyContent: 'space-between'}}>
        {/* 방법 1: <LightLeak> 컴포넌트를 장면 위에 겹치고 'screen'으로 섞기 */}
        <div style={{width: W}}>
          <div style={{position: 'relative', width: W, height: H, borderRadius: 18, overflow: 'hidden'}}>
            <TitleCard />
            <AbsoluteFill style={{mixBlendMode: 'screen'}}>
              {/* width/height를 주면 작은 칸 크기에 맞춰 그려짐 (안 주면 영상 전체 크기) */}
              <LightLeak width={W} height={H} durationInFrames={180} seed={3} hueShift={0} />
            </AbsoluteFill>
          </div>
          <Label code="<LightLeak seed={3} />" ko="@remotion/light-leaks · 길이 = 애니메이션 길이" />
        </div>

        {/* 방법 2 (권장): <Img>의 effects에 lightLeak()를 넣기 — width/height는 숫자로! */}
        <div style={{width: W}}>
          <div style={{width: W, height: H, borderRadius: 18, overflow: 'hidden'}}>
            <Img
              src={PHOTO}
              width={W}
              height={H}
              style={{width: W, height: H, objectFit: 'cover'}}
              effects={[lightLeak({progress, seed: 7, hueShift: 30})]}
            />
          </div>
          <Label code={`lightLeak({progress: ${progress.toFixed(2)}})`} ko="<Img effects={[…]}> · @remotion/effects (권장)" />
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
