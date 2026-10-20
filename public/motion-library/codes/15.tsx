// frames=180 size=1280x720
import {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {fitText, fitTextOnNLines, measureText} from '@remotion/layout-utils';
import {FONT} from './font';

// 폰트 파일이 다 받아져서 브라우저에 등록될 때까지 0.05초마다 확인하며 기다리기
const waitForFont = async (family: string) => {
  while (![...document.fonts].some((face) => face.family.replace(/"/g, '') === family && face.status === 'loaded')) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

const GOLD = '#FFC93C';
const TITLE = '초보자도 30분 만에 끝내는 AI 영상 자동화 완벽 가이드';
const WORD = '리모션 강의';

const Tag = ({api, ko}: {api: string; ko: string}) => (
  <div style={{width: 300, flexShrink: 0}}>
    <div style={{color: GOLD, fontSize: 28, fontWeight: 900}}>{api}</div>
    <div style={{color: '#9fb0d0', fontSize: 20, marginTop: 4}}>{ko}</div>
  </div>
);

const SceneBody = () => {
  const f = useCurrentFrame();

  // ⚠️ 글자 크기를 재는 함수들은 폰트가 로드된 뒤에 써야 정확해요
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('폰트 로딩'));
  useEffect(() => {
    waitForFont(FONT).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  if (!ready) return <AbsoluteFill style={{background: '#050914'}} />;

  // 1) measureText: 이 글자가 화면에서 몇 px인지 재기
  const m = measureText({text: WORD, fontFamily: FONT, fontSize: 72, fontWeight: 900});

  // 2) fitText: 상자 너비가 바뀌어도 "한 줄에 꽉 차는" 글자 크기 계산
  const boxW = interpolate(Math.sin(f / 25), [-1, 1], [420, 880]);
  const {fontSize: oneLine} = fitText({text: TITLE, withinWidth: boxW, fontFamily: FONT, fontWeight: 900});

  // 3) fitTextOnNLines: 최대 N줄 안에 들어가는 글자 크기 + 줄 나눔 결과
  const two = fitTextOnNLines({text: TITLE, maxLines: 2, maxBoxWidth: 700, fontFamily: FONT, fontWeight: 900, maxFontSize: 80});

  const row = {display: 'flex', alignItems: 'center', gap: 30, width: 1180} as const;
  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center', paddingTop: 30, gap: 34}}>
      <div style={{color: '#fff', fontSize: 40, fontWeight: 900}}>@remotion/layout-utils</div>

      <div style={row}>
        <Tag api="measureText()" ko="글자의 너비·높이(px) 재기" />
        <div>
          <div style={{color: '#fff', fontSize: 72, fontWeight: 900, lineHeight: 1.1}}>{WORD}</div>
          <div style={{width: m.width, height: 8, background: GOLD, borderRadius: 4, marginTop: 8}} />
          <div style={{color: GOLD, fontSize: 22, marginTop: 6}}>{`width ${Math.round(m.width)}px · height ${Math.round(m.height)}px`}</div>
        </div>
      </div>

      <div style={row}>
        <Tag api="fitText()" ko="상자 너비에 맞춰 글자 크기 자동" />
        <div>
          <div style={{width: boxW, border: `2px dashed ${GOLD}`, padding: '6px 0'}}>
            <div style={{color: '#fff', fontSize: oneLine, fontWeight: 900, whiteSpace: 'nowrap'}}>{TITLE}</div>
          </div>
          <div style={{color: GOLD, fontSize: 22, marginTop: 6}}>{`withinWidth ${Math.round(boxW)}px → fontSize ${oneLine.toFixed(1)}px`}</div>
        </div>
      </div>

      <div style={row}>
        <Tag api="fitTextOnNLines()" ko="최대 2줄 안에 맞추기" />
        <div>
          <div style={{width: 700, border: `2px dashed ${GOLD}`, padding: '6px 0'}}>
            {two.lines.map((line, i) => (
              <div key={i} style={{color: '#fff', fontSize: two.fontSize, fontWeight: 900, lineHeight: 1.2, whiteSpace: 'nowrap'}}>{line}</div>
            ))}
          </div>
          <div style={{color: GOLD, fontSize: 22, marginTop: 6}}>{`maxLines 2 → fontSize ${two.fontSize.toFixed(1)}px, ${two.lines.length}줄`}</div>
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
