// frames=150 size=1280x720
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {FONT} from './font';

// 1) 카메라를 프레임에 맞춰 물체 주위로 한 바퀴 돌리는 작은 컴포넌트
//    (useFrame 같은 "실시간 시계"는 쓰지 않아요 — 모든 움직임은 useCurrentFrame 으로!)
const OrbitCamera = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const camera = useThree((s) => s.camera);
  const angle = (frame / durationInFrames) * Math.PI * 2; // 영상 길이 동안 360도
  camera.position.set(Math.sin(angle) * 7, 1.6, Math.cos(angle) * 7);
  camera.lookAt(0, 0.3, 0);
  return null;
};

const SceneBody = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const spin = frame * 0.03; // 물체 자체도 천천히 회전

  return (
    <AbsoluteFill style={{background: '#050914'}}>
      {/* 2) ThreeCanvas = 리모션용 3D 캔버스. 안쪽은 React Three Fiber 문법 그대로 */}
      <ThreeCanvas width={width} height={height} camera={{fov: 45, position: [0, 2, 6]}}>
        <OrbitCamera />
        {/* 3) 조명: 은은한 전체 빛 + 한쪽에서 비추는 강한 빛 */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={2.5} />
        <pointLight position={[-4, -1, 3]} intensity={30} color="#5b8cff" />

        {/* 4) 메시 = 모양(geometry) + 재질(material). 금색 금속 매듭 */}
        <mesh rotation={[spin, spin * 0.7, 0]}>
          <torusKnotGeometry args={[0.8, 0.26, 100, 16]} />
          <meshStandardMaterial color="#FFC93C" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* 바닥 판 */}
        <mesh position={[0, -1.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.4, 48]} />
          <meshStandardMaterial color="#16224a" />
        </mesh>
      </ThreeCanvas>

      {/* 5) 글자는 3D 위에 일반 HTML 로 겹쳐 올리면 한글도 깔끔해요 */}
      <div style={{position: 'absolute', top: 40, width: '100%', textAlign: 'center', fontFamily: FONT}}>
        <div style={{color: '#FFC93C', fontSize: 44, fontWeight: 700}}>{'<ThreeCanvas>'}</div>
        <div style={{color: '#fff', opacity: 0.75, fontSize: 26}}>프레임에 맞춰 도는 3D — 카메라가 한 바퀴 공전</div>
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
