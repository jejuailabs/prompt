// frames=150 size=1280x720
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {Lottie, LottieAnimationData} from '@remotion/lottie';
import {FONT} from './font';

// 1) Lottie(Bodymovin) JSON — 애프터이펙트에서 내보내거나 LottieFiles 에서 받은 파일 내용입니다.
//    여기서는 "동그라미가 그려지고 체크 표시가 나타나는" 아주 작은 애니메이션을 직접 붙여 넣었어요. (30fps, 60프레임 = 2초)
const tr = {ty: 'tr', p: {a: 0, k: [0, 0]}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: 0}, o: {a: 0, k: 100}};
const layer = (ind: number, rotate: number, shapes: object[]) => ({
  ty: 4, ind, ip: 0, op: 60, st: 0, sr: 1, ao: 0, bm: 0, ddd: 0,
  ks: {o: {a: 0, k: 100}, r: {a: 0, k: rotate}, p: {a: 0, k: [200, 200, 0]}, a: {a: 0, k: [0, 0, 0]}, s: {a: 0, k: [100, 100, 100]}},
  shapes: [{ty: 'gr', it: [...shapes, tr]}],
});
// 선을 0% → 100% 까지 그려 주는 "Trim Paths" (from 프레임부터 to 프레임까지)
const trim = (from: number, to: number) => ({ty: 'tm', s: {a: 0, k: 0}, o: {a: 0, k: 0}, m: 1,
  e: {a: 1, k: [{t: from, s: [0], i: {x: [0.33], y: [1]}, o: {x: [0.67], y: [0]}}, {t: to, s: [100]}]}});
const stroke = (rgb: number[], w: number) => ({ty: 'st', c: {a: 0, k: [...rgb, 1]}, o: {a: 0, k: 100}, w: {a: 0, k: w}, lc: 2, lj: 2});

const CHECK = {
  v: '5.7.4', fr: 30, ip: 0, op: 60, w: 400, h: 400, ddd: 0, assets: [],
  layers: [
    layer(1, 0, [{ty: 'sh', ks: {a: 0, k: {i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]], v: [[-72, 4], [-22, 54], [78, -52]], c: false}}}, trim(18, 40), stroke([0.49, 0.95, 0.78], 26)]),
    layer(2, -90, [{ty: 'el', d: 1, s: {a: 0, k: [300, 300]}, p: {a: 0, k: [0, 0]}}, trim(0, 24), stroke([1, 0.79, 0.24], 14)]),
  ],
} as unknown as LottieAnimationData;

// 2) 같은 애니메이션을 옵션만 바꿔 세 번 보여주기
const DEMOS = [
  {props: {}, api: '기본', ko: '한 번 재생 후 멈춤'},
  {props: {loop: true}, api: 'loop', ko: '계속 반복'},
  {props: {loop: true, playbackRate: 2}, api: 'playbackRate={2}', ko: '2배 빠르게 반복'},
];

const SceneBody = () => (
  <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center', justifyContent: 'center'}}>
    <div style={{color: '#FFC93C', fontSize: 44, fontWeight: 700}}>{'<Lottie animationData={json} />'}</div>
    <div style={{color: '#fff', opacity: 0.7, fontSize: 26, marginTop: 6}}>Lottie JSON 을 프레임에 딱 맞춰 재생</div>
    <div style={{display: 'flex', gap: 40, marginTop: 40}}>
      {DEMOS.map((d) => (
        <div key={d.api} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div style={{width: 320, height: 320, borderRadius: 24, background: '#101a36'}}>
            {/* 3) 핵심은 이 한 줄 */}
            <Lottie animationData={CHECK} {...d.props} style={{width: '100%', height: '100%'}} />
          </div>
          <div style={{color: '#FFC93C', fontSize: 28, fontFamily: 'monospace', marginTop: 16}}>{d.api}</div>
          <div style={{color: '#fff', fontSize: 26}}>{d.ko}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

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
