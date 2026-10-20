// frames=150 size=1280x720
// No Remotion: same scene code, imports switched from `remotion` to the Motion Lite runtime.
import {AbsoluteFill, FONT, googleFont, interpolate, useCurrentFrame, useVideoConfig} from '../runtime';
const NotoSansKR = googleFont('Noto Sans KR');
const BlackHanSans = googleFont('Black Han Sans');
const DoHyeon = googleFont('Do Hyeon');
const Jua = googleFont('Jua');
const NanumMyeongjo = googleFont('Nanum Myeongjo');
const NanumPenScript = googleFont('Nanum Pen Script');

const GOLD = '#FFC93C';
const SAMPLE = 'AI로 영상 만들기, 오늘 시작해요!';

// 한글 구글 폰트는 글자 범위별로 100개 넘는 조각(subset)으로 나뉘어 있어요.
// 통째로 부르면 조각을 전부 내려받아 느려지니까 → 예문에 쓰인 글자가 들어 있는 조각만 골라서 불러요
type GoogleFont = {
  getInfo: () => {unicodeRanges: Record<string, string>};
  loadFont: (style: 'normal', options: any) => {fontFamily: string};
};
const inRange = (cp: number, ranges: string) =>
  ranges.split(',').some((r) => {
    const [a, b = a] = r.trim().replace('U+', '').split('-'); // "U+ac00-ac5b" → ac00, ac5b
    return cp >= parseInt(a, 16) && cp <= parseInt(b, 16);
  });
const loadOnly = (font: GoogleFont, weight: string, text: string) => {
  const ranges = font.getInfo().unicodeRanges;
  const codes = [...text].map((c) => c.codePointAt(0)!);
  const chunks = Object.keys(ranges).filter((key) => key.startsWith('[') && codes.some((cp) => inRange(cp, ranges[key])));
  return font.loadFont('normal', {weights: [weight], subsets: [...chunks, 'latin']}).fontFamily;
};

const FONTS = [
  {name: 'NotoSansKR', family: loadOnly(NotoSansKR, '700', SAMPLE), weight: 700, vibe: '깔끔한 고딕 · 본문'},
  {name: 'BlackHanSans', family: loadOnly(BlackHanSans, '400', SAMPLE), weight: 400, vibe: '두꺼운 제목 · 썸네일'},
  {name: 'DoHyeon', family: loadOnly(DoHyeon, '400', SAMPLE), weight: 400, vibe: '각진 제목체'},
  {name: 'Jua', family: loadOnly(Jua, '400', SAMPLE), weight: 400, vibe: '둥글둥글 · 친근함'},
  {name: 'NanumMyeongjo', family: loadOnly(NanumMyeongjo, '800', SAMPLE), weight: 800, vibe: '명조 · 진지한 인용'},
  {name: 'NanumPenScript', family: loadOnly(NanumPenScript, '400', SAMPLE), weight: 400, vibe: '손글씨 · 메모 느낌'},
];

const SceneBody = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center', paddingTop: 36}}>
      <div style={{color: '#fff', fontSize: 40, fontWeight: 900}}>googleFont() · Google Fonts</div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 590px)', gap: 20, marginTop: 30}}>
        {FONTS.map((font, i) => {
          const appear = interpolate(f, [i * 8, i * 8 + 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <div key={font.name} style={{background: '#0d1630', borderRadius: 18, padding: '18px 26px', opacity: appear, transform: `translateY(${(1 - appear) * 20}px)`}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                <span style={{color: GOLD, fontSize: 24, fontWeight: 900}}>{font.name}</span>
                <span style={{color: '#9fb0d0', fontSize: 18}}>{font.vibe}</span>
              </div>
              {/* fontFamily에 loadFont()가 돌려준 이름을 그대로 넣으면 끝! */}
              <div style={{fontFamily: font.family, fontWeight: font.weight, color: '#fff', fontSize: 38, marginTop: 8, whiteSpace: 'nowrap'}}>{SAMPLE}</div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', bottom: 60, color: GOLD, fontSize: 24, fontFamily: 'monospace'}}>
        {`loadFont('normal', {weights: ['400'], subsets: [...]}) → fontFamily`}
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
