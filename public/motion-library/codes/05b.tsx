// frames=180 size=1280x720
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
import {vignette} from '@remotion/effects/vignette';
import {noise} from '@remotion/effects/noise';
import {regionBlur} from '@remotion/effects/region-blur';
import {radialProgressiveBlur} from '@remotion/effects/radial-progressive-blur';
import {FONT} from './font';

const GOLD = '#FFC93C';
const SRC = 'https://www.aicitybuilders.com/video/remotion/assets/jay.mp4'; // 제이 강의 영상 10초
const W = 390;
const H = 219;

const SceneBody = () => {
  const f = useCurrentFrame();
  // 1.5초마다 효과 끄기/켜기 → 원본과 비교 (disabled: true 면 그 효과만 건너뜀)
  const off = Math.floor(f / 45) % 2 === 0;
  const cx = 0.35 + 0.3 * Math.sin(f / 30); // 스포트라이트 중심이 좌우로 이동

  // 강의 영상에 바로 쓰는 이펙트 "레시피" 3가지 (배열 순서대로 겹쳐 적용)
  const RECIPES = [
    {
      name: '필름 룩',
      code: ['vignette({amount: 0.8})', 'noise({amount: 0.25,', '  seed: frame})'],
      // 가장자리 어둡게 + 필름 그레인(seed를 프레임마다 바꿔야 지글거림)
      fx: [vignette({amount: 0.8, radius: 0.45, feather: 0.5, disabled: off}), noise({amount: 0.25, seed: f, disabled: off})],
    },
    {
      name: '칠판 일부 가리기',
      code: ['regionBlur({', '  topLeft: [0.04, 0.12],', '  bottomRight: [0.4, 0.88] })'],
      // 화면의 일부(UV 좌표: 0~1 비율)만 흐리게 — 이메일·얼굴·전화번호 가리기
      fx: [regionBlur({topLeft: [0.04, 0.12], bottomRight: [0.4, 0.88], blurRadius: 80, feather: 12, roundness: 0.3, disabled: off})],
    },
    {
      name: '스포트라이트',
      code: ['radialProgressiveBlur({', '  center: [x, 0.5], endBlur: 60})', 'vignette({center: [x, 0.5]})'],
      // 가운데(타원 안)는 선명, 바깥으로 갈수록 흐리게 + 어둡게 → 시선 집중
      fx: [
        radialProgressiveBlur({center: [cx, 0.5], width: 0.5, height: 0.8, start: 0.3, endBlur: 60, disabled: off}),
        vignette({amount: 0.7, radius: 0.35, feather: 0.5, center: [cx, 0.5], disabled: off}),
      ],
    },
  ];

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, color: '#fff'}}>
      <div style={{position: 'absolute', top: 30, width: '100%', textAlign: 'center', fontSize: 40, fontWeight: 900}}>
        {'<Video effects={[…]} />'} 실전 레시피 3가지
      </div>

      <div style={{position: 'absolute', top: 140, left: 30, right: 30, display: 'flex', justifyContent: 'space-between'}}>
        {RECIPES.map((r) => (
          <div key={r.name} style={{width: W}}>
            <div style={{position: 'relative', width: W, height: H, borderRadius: 14, overflow: 'hidden', border: `2px solid ${GOLD}`}}>
              {/* @remotion/media 의 <Video>는 effects를 지원 (remotion의 OffthreadVideo는 아님) */}
              <Video src={SRC} muted effects={r.fx} style={{width: W, height: H, objectFit: 'cover'}} />
              <div style={{position: 'absolute', right: 10, top: 10, padding: '4px 12px', borderRadius: 8, fontSize: 22, fontWeight: 900, background: off ? '#fff' : GOLD, color: '#050914'}}>
                {off ? '원본' : '효과 ON'}
              </div>
            </div>
            <div style={{fontSize: 34, fontWeight: 900, color: GOLD, marginTop: 14}}>{r.name}</div>
            <div style={{marginTop: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', fontSize: 18, lineHeight: 1.5, whiteSpace: 'pre', fontFamily: 'monospace'}}>
              {r.code.join('\n')}
            </div>
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
