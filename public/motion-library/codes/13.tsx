// frames=180 size=1280x720
import {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {createRoundedTextBox} from '@remotion/rounded-text-box';
import {measureText} from '@remotion/layout-utils';
import {FONT} from './font';

// 폰트 파일이 다 받아져서 브라우저에 등록될 때까지 0.05초마다 확인하며 기다리기
const waitForFont = async (family: string) => {
  while (![...document.fonts].some((face) => face.family.replace(/"/g, '') === family && face.status === 'loaded')) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

const GOLD = '#FFC93C';
const SIZE = 64; // 자막 글자 크기
const WEIGHT = 900;
const LINE_H = Math.round(SIZE * 1.35); // 한 줄 높이
const PAD = 28; // 좌우 여백
// 자막 2줄, 단어 단위로 하나씩 등장
const LINES = [['AI에게', '일을', '시킬', '때는'], ['맥락을', '먼저', '주세요!']];
const ALL = LINES.flat();

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ⚠️ measureText는 폰트가 다 로드된 뒤에 재야 정확해요 → 로드될 때까지 렌더를 잠깐 멈춤
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('폰트 로딩'));
  useEffect(() => {
    waitForFont(FONT).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);

  // 0.4초마다 단어 하나씩 추가
  const shown = Math.min(ALL.length, Math.floor(f / 12) + 1);
  let k = 0;
  const lines = LINES.map((ln) => ln.filter(() => k++ < shown)).filter((ln) => ln.length > 0);

  if (!ready) return <AbsoluteFill style={{background: '#050914'}} />;

  // 1) measureText: 줄마다 글자 너비 재기
  const sizes = lines.map((ln) => ({
    width: measureText({text: ln.join(' '), fontFamily: FONT, fontSize: SIZE, fontWeight: WEIGHT}).width,
    height: LINE_H,
  }));
  // 2) createRoundedTextBox: 줄 너비들 → 하나로 이어진 둥근 박스 SVG 경로(d)
  const {d, boundingBox: bb} = createRoundedTextBox({textMeasurements: sizes, textAlign: 'center', horizontalPadding: PAD, borderRadius: 22});

  const pop = spring({frame: f % 12, fps, config: {damping: 10}}); // 새 단어가 톡 튀어나오기

  return (
    <AbsoluteFill style={{background: 'linear-gradient(160deg, #1b2b5e, #050914 70%)', fontFamily: FONT}}>
      <div style={{position: 'absolute', top: 40, width: '100%', textAlign: 'center', color: '#fff', fontSize: 40, fontWeight: 900}}>@remotion/rounded-text-box</div>
      <div style={{position: 'absolute', top: 100, width: '100%', textAlign: 'center', color: GOLD, fontSize: 28, fontWeight: 900}}>measureText() → createRoundedTextBox()</div>
      <div style={{position: 'absolute', top: 145, width: '100%', textAlign: 'center', color: '#9fb0d0', fontSize: 22}}>
        줄 너비: {sizes.map((s) => `${Math.round(s.width)}px`).join(' / ')}
      </div>

      {/* 박스(SVG) + 글자(div)를 같은 크기의 상자 안에 겹쳐 놓기 */}
      <div style={{position: 'absolute', left: (1280 - bb.width) / 2, bottom: 110, width: bb.width, height: bb.height}}>
        <svg width={bb.width} height={bb.height} viewBox={`${bb.x1} ${bb.y1} ${bb.width} ${bb.height}`} style={{position: 'absolute'}}>
          <path d={d} fill="#ffffff" />
        </svg>
        {lines.map((ln, i) => (
          <div key={i} style={{position: 'absolute', top: i * LINE_H, width: '100%', height: LINE_H, lineHeight: `${LINE_H}px`, textAlign: 'center', fontSize: SIZE, fontWeight: WEIGHT, color: '#111', whiteSpace: 'pre'}}>
            {ln.map((w, j) => {
              const isNew = i === lines.length - 1 && j === ln.length - 1; // 방금 나온 단어
              return (
                <span key={j} style={{color: isNew ? '#e8336d' : '#111', display: 'inline-block', transform: isNew ? `scale(${0.6 + pop * 0.4})` : undefined}}>
                  {w}{j < ln.length - 1 ? ' ' : ''}
                </span>
              );
            })}
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
