// frames=180 size=1280x720
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {parsePath, translatePath} from '@remotion/paths';
import {extrudeAndTransformElement, reduceMatrices, rotateX, rotateY, scaled, threeDIntoSvgPath, transformPath, translateZ} from '@remotion/svg-3d-engine';
import {FONT} from './font';

const GOLD = '#FFC93C';

// "AI" 글자를 평면 SVG 경로 4조각으로 (A 왼쪽, A 오른쪽, A 가로줄, I)
// translatePath로 전체 가운데(145, 100)가 (0, 0)에 오도록 옮겨 둬요 → 가운데를 축으로 회전
const LETTERS = [
  'M 0 200 L 62 0 L 100 0 L 42 200 Z',
  'M 100 0 L 138 0 L 200 200 L 158 200 Z',
  'M 48 118 L 152 118 L 142 152 L 58 152 Z',
  'M 240 0 L 290 0 L 290 200 L 240 200 Z',
].map((d) => translatePath(d, -145, -100));

const SceneBody = () => {
  const f = useCurrentFrame();
  const t = f / 30;

  // 1) 두께(depth): 처음 1초 동안 0 → 60 으로 "튀어나오기"
  const depth = interpolate(f, [0, 30], [1, 60], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  // 2) 회전 행렬 만들기: 라디안 단위 (1 라디안 ≈ 57도)
  const matrix = reduceMatrices([
    scaled(1.4),
    rotateY(Math.sin(t * 1.2) * 0.8), // 좌우로 흔들
    rotateX(-0.35 + Math.sin(t * 0.8) * 0.15), // 살짝 내려다보기
  ]);

  // 3) 글자마다 옆면(side faces)을 만들고, 모두 모아 "먼 것부터" 그리기
  const sides = LETTERS.flatMap((d) =>
    extrudeAndTransformElement({points: parsePath(d), depth, pressInDepth: 0, sideColor: '#a8740a', crispEdges: false, transformations: matrix}),
  );
  const zOf = (face: (typeof sides)[number]) => face.points.reduce((sum, p) => sum + p.point[2], 0) / face.points.length;
  sides.sort((a, b) => zOf(b) - zOf(a)); // z가 클수록 멀리 있음 → 먼저 그림

  // 4) 앞면(뚜껑)은 원래 2D 경로를 앞쪽(-depth/2)으로 옮긴 뒤 같은 행렬로 변환
  const fronts = LETTERS.map((d) => transformPath({path: d, transformation: reduceMatrices([translateZ(-depth / 2), matrix])}));

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center'}}>
      <div style={{color: '#fff', fontSize: 40, fontWeight: 900, marginTop: 40}}>@remotion/svg-3d-engine</div>
      <svg width={1280} height={460} viewBox="-640 -230 1280 460">
        {sides.map((face, i) => (
          // threeDIntoSvgPath: 3D 점들 → 화면에 그릴 2D path 문자열
          <path key={i} d={threeDIntoSvgPath(face.points)} fill={face.color} stroke="#6b4a06" strokeWidth={0.6} />
        ))}
        {fronts.map((d, i) => (
          <path key={`front-${i}`} d={d} fill={GOLD} stroke="#ffe08a" strokeWidth={1.5} strokeLinejoin="round" />
        ))}
      </svg>
      <div style={{color: GOLD, fontSize: 30, fontWeight: 900, fontFamily: 'monospace'}}>
        extrudeAndTransformElement · rotateX / rotateY · threeDIntoSvgPath
      </div>
      <div style={{color: '#fff', fontSize: 24, marginTop: 10}}>평면 SVG 글자에 두께를 주고 3D로 돌려요 (WebGL 없이 순수 SVG)</div>
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
