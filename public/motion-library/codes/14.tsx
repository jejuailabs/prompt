// frames=180 size=1080x1920
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption, createTikTokStyleCaptions} from '@remotion/captions';
import {FONT} from './font';

// 1) 단어별 타임스탬프 (보통은 Whisper 같은 음성인식 결과를 그대로 넣습니다)
//    두 번째 단어부터는 앞에 띄어쓰기 ' ' 를 붙여 둡니다 → 자막을 합칠 때 띄어쓰기가 유지돼요.
const WORDS: [string, number, number][] = [
  ['오늘은', 200, 600], [' 코드로', 600, 1000], [' 영상을', 1000, 1400], [' 만드는', 1400, 1750],
  [' 방법을', 1750, 2150], [' 알아볼게요', 2150, 2900],
  [' 자막도', 3300, 3700], [' 음악도', 3700, 4100], [' 자동으로', 4100, 4600], [' 맞춰집니다', 4600, 5400],
];
const captions: Caption[] = WORDS.map(([text, startMs, endMs]) => ({text, startMs, endMs, timestampMs: startMs, confidence: 1}));

// 2) 짧은 "페이지"(한 화면에 뜨는 자막 덩어리)로 묶기 — 숫자가 작을수록 한 화면에 단어가 적어요
const {pages} = createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds: 700});

const SceneBody = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = (frame / fps) * 1000; // 지금 시각 (밀리초)

  // 3) 지금 시각에 해당하는 페이지 찾기
  const page = pages.find((p) => ms >= p.startMs && ms < p.startMs + p.durationMs);
  const pop = page ? interpolate(ms - page.startMs, [0, 150], [0.85, 1], {extrapolateRight: 'clamp'}) : 1;

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT}}>
      <div style={{position: 'absolute', top: 160, width: '100%', textAlign: 'center', color: '#FFC93C', fontSize: 52, fontWeight: 700}}>
        createTikTokStyleCaptions()
      </div>
      <div style={{position: 'absolute', top: 250, width: '100%', textAlign: 'center', color: '#fff', opacity: 0.7, fontSize: 38}}>
        단어 타임스탬프 → 짧은 자막 + 현재 단어 강조
      </div>

      {/* 4) 자막: 지금 말하는 단어(token)만 금색으로 */}
      {page && (
        <div style={{position: 'absolute', top: 1250, left: 60, right: 60, textAlign: 'center', fontSize: 70, fontWeight: 800,
          color: '#fff', whiteSpace: 'pre-wrap', transform: `scale(${pop})`, WebkitTextStroke: '6px #000', paintOrder: 'stroke fill'}}>
          {page.tokens.map((t) => {
            const active = ms >= t.fromMs && ms < t.toMs;
            return <span key={t.fromMs} style={{color: active ? '#FFC93C' : '#fff'}}>{t.text}</span>;
          })}
        </div>
      )}

      {/* 참고용: 페이지 목록 */}
      <div style={{position: 'absolute', bottom: 160, width: '100%', textAlign: 'center', color: '#fff', opacity: 0.45, fontSize: 30, lineHeight: 1.6}}>
        {pages.map((p, i) => <div key={i} style={{color: p === page ? '#FFC93C' : undefined}}>페이지 {i + 1}: {p.text.trim()}</div>)}
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
