// frames=150 size=1280x720
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {useGsapTimeline} from '@remotion/gsap';
import {FONT} from './font';

const TITLE = 'GSAP으로 움직이기';
const CARDS = ['기획', '촬영', '편집', '업로드'];

const SceneBody = () => {
  // 1) useGsapTimeline: GSAP 타임라인을 만들면, 리모션이 매 프레임 그 시점으로 "되감기"해 줍니다
  //    selector('.char') 는 ref 를 단 div 안쪽에서만 찾아요.
  const ref = useGsapTimeline<HTMLDivElement>(({timeline, selector}) => {
    timeline
      // 2) 제목: 글자 하나하나가 아래에서 회전하며 등장 (stagger = 글자마다 0.05초씩 시차)
      .from(selector('.char'), {y: 80, opacity: 0, rotation: -30, duration: 0.6, ease: 'back.out(2)', stagger: 0.05})
      // 3) 카드: 0.15초 간격으로 차례차례 튀어 오름
      .from(selector('.card'), {y: 200, opacity: 0, scale: 0.6, duration: 0.8, ease: 'power3.out', stagger: 0.15}, '-=0.2')
      // 4) 마지막에 카드 색을 금색으로 물결처럼 바꾸기
      .to(selector('.card'), {backgroundColor: '#FFC93C', color: '#050914', duration: 0.3, stagger: 0.1}, '+=0.4');
  });

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center', justifyContent: 'center'}}>
      <div ref={ref} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{color: '#FFC93C', fontSize: 34, fontFamily: 'monospace', marginBottom: 20}}>useGsapTimeline + stagger</div>

        {/* 글자를 <span> 하나씩으로 쪼개야 글자별 애니메이션이 됩니다 */}
        <div style={{fontSize: 96, fontWeight: 900, color: '#fff'}}>
          {[...TITLE].map((c, i) => (
            <span key={i} className="char" style={{display: 'inline-block', whiteSpace: 'pre'}}>{c}</span>
          ))}
        </div>

        <div style={{display: 'flex', gap: 30, marginTop: 60}}>
          {CARDS.map((c, i) => (
            <div key={c} className="card" style={{width: 220, height: 160, borderRadius: 24, background: '#16224a', color: '#fff',
              fontSize: 44, fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{fontSize: 26, opacity: 0.6}}>{i + 1}단계</div>
              {c}
            </div>
          ))}
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
