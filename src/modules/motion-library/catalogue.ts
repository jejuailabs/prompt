// FunJeju Motion Library catalogue — names, descriptions and cover themes written for PLAYLAB.
// Original Remotion code is served unmodified from /public/motion-library/codes/<id>.<ext> (attribution kept inside each file).
// Source: CONNECT AI LAB / AI CITY BUILDERS (https://www.aicitybuilders.com/remotion)

export interface MotionItem {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  category: string;
  tags: string[];
  theme: string;
  seed: string | number;
  coverLabel: string;
  sourceTitle: string;
  sourceUrl: string;
  package: string;
  codeFile: string;
  codeLanguage: 'tsx' | 'mjs';
}

export const MOTION_SOURCE = { name: 'CONNECT AI LAB / AI CITY BUILDERS', url: 'https://www.aicitybuilders.com/remotion' };

export const MOTION_CATEGORIES: string[] = ["제품 광고", "캐릭터", "기초 구성", "화면 효과", "도형·모션", "타이포그래피", "미디어", "심화 활용"];

export const MOTION_ITEMS: MotionItem[] = [
  {
    "id": "51",
    "title": "스포트라이트 온",
    "titleEn": "Spotlight Pop",
    "description": "제품이 무대 위로 튀어 오르고 빛과 문구가 시선을 모읍니다. 첫 장면에서 주인공을 또렷하게 보여 주는 구성입니다.",
    "category": "제품 광고",
    "tags": [
      "spring",
      "product",
      "reveal"
    ],
    "theme": "poster",
    "seed": 1,
    "coverLabel": "SPOTLIGHT REVEAL",
    "sourceTitle": "히어로 등장",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#51",
    "package": "제품 이미지",
    "codeFile": "/motion-library/codes/51.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "52",
    "title": "옆으로 넘기는 쇼룸",
    "titleEn": "Moving Shelf",
    "description": "제품을 가로로 흐르게 배치해 여러 선택지를 연속으로 보여 줍니다. 이동 간격과 등장 순서를 살펴보기 좋은 장면입니다.",
    "category": "제품 광고",
    "tags": [
      "carousel",
      "product",
      "sequence"
    ],
    "theme": "grid",
    "seed": 2,
    "coverLabel": "PRODUCT CAROUSEL",
    "sourceTitle": "제품 캐러셀",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#52",
    "package": "제품 이미지",
    "codeFile": "/motion-library/codes/52.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "53",
    "title": "디테일에 선을 잇다",
    "titleEn": "Detail Finder",
    "description": "제품의 특정 지점에서 설명선을 뻗어 기능을 짚어 줍니다. 이미지와 짧은 정보의 연결 방식을 참고할 수 있습니다.",
    "category": "제품 광고",
    "tags": [
      "callout",
      "product",
      "paths"
    ],
    "theme": "orbit",
    "seed": 3,
    "coverLabel": "FEATURE CALLOUTS",
    "sourceTitle": "특징 콜아웃",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#53",
    "package": "제품 이미지",
    "codeFile": "/motion-library/codes/53.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "54",
    "title": "손안의 세로 광고",
    "titleEn": "Portrait Promo",
    "description": "좁고 긴 화면 안에 제품과 카피를 배치한 홍보 장면입니다. 세로 영상의 시선 흐름과 여백 사용을 살펴봅니다.",
    "category": "제품 광고",
    "tags": [
      "vertical",
      "product",
      "promo"
    ],
    "theme": "poster",
    "seed": 4,
    "coverLabel": "VERTICAL SPOT",
    "sourceTitle": "세로 쇼츠 광고",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#54",
    "package": "제품 이미지",
    "codeFile": "/motion-library/codes/54.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "55",
    "title": "혜택을 크게 말하기",
    "titleEn": "Offer Tags",
    "description": "가격과 할인 정보를 배지 형태로 등장시킵니다. 작은 숫자와 큰 포인트 요소의 대비로 메시지에 힘을 줍니다.",
    "category": "제품 광고",
    "tags": [
      "badge",
      "price",
      "product"
    ],
    "theme": "collage",
    "seed": 5,
    "coverLabel": "PRICE & BADGES",
    "sourceTitle": "가격·할인 배지",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#55",
    "package": "제품 이미지",
    "codeFile": "/motion-library/codes/55.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "56",
    "title": "캐릭터의 제품 토크",
    "titleEn": "Mascot Pitch",
    "description": "캐릭터가 제품 옆에 등장해 소개를 이끕니다. 친근한 진행자와 제품 정보를 한 장면에 담는 방식입니다.",
    "category": "제품 광고",
    "tags": [
      "character",
      "product",
      "presentation"
    ],
    "theme": "collage",
    "seed": 6,
    "coverLabel": "MASCOT PRESENTS",
    "sourceTitle": "캐릭터가 소개하는 광고",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#56",
    "package": "제품 이미지",
    "codeFile": "/motion-library/codes/56.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "57",
    "title": "입체적인 제품 행렬",
    "titleEn": "Showroom Orbit",
    "description": "서로 다른 깊이에 제품을 놓아 라인업을 보여 줍니다. 평면 이미지로 공간감 있는 전시 장면을 만드는 아이디어입니다.",
    "category": "제품 광고",
    "tags": [
      "3d",
      "product",
      "showcase"
    ],
    "theme": "orbit",
    "seed": 7,
    "coverLabel": "LINEUP IN DEPTH",
    "sourceTitle": "라인업 3D 쇼케이스",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#57",
    "package": "제품 이미지",
    "codeFile": "/motion-library/codes/57.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "41",
    "title": "안녕, 첫 인사",
    "titleEn": "Hello Bubble",
    "description": "캐릭터와 말풍선이 차례로 나타나 인사를 전합니다. 등장 타이밍과 짧은 대사를 함께 조율하는 장면입니다.",
    "category": "캐릭터",
    "tags": [
      "character",
      "spring",
      "speech"
    ],
    "theme": "collage",
    "seed": 8,
    "coverLabel": "HELLO BUBBLE",
    "sourceTitle": "등장 + 말풍선",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#41",
    "package": "캐릭터 PNG",
    "codeFile": "/motion-library/codes/41.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "42",
    "title": "가만히 있어도 생동감",
    "titleEn": "Quiet Motion",
    "description": "정지 이미지에 작은 흔들림과 호흡 같은 움직임을 더합니다. 화면을 차지한 캐릭터가 자연스럽게 기다리는 느낌을 만듭니다.",
    "category": "캐릭터",
    "tags": [
      "character",
      "idle",
      "loop"
    ],
    "theme": "collage",
    "seed": 9,
    "coverLabel": "IDLE & BREATHE",
    "sourceTitle": "살아 있는 대기 동작",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#42",
    "package": "캐릭터 PNG",
    "codeFile": "/motion-library/codes/42.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "43",
    "title": "통통, 다음 자리로",
    "titleEn": "Hop Route",
    "description": "캐릭터가 포물선을 따라 점프하며 위치를 바꿉니다. 이동 경로와 착지 순간을 함께 디자인하는 예시입니다.",
    "category": "캐릭터",
    "tags": [
      "character",
      "path",
      "jump"
    ],
    "theme": "particles",
    "seed": 10,
    "coverLabel": "HOP ALONG A PATH",
    "sourceTitle": "점프하며 이동",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#43",
    "package": "캐릭터 PNG",
    "codeFile": "/motion-library/codes/43.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "44",
    "title": "겹겹이 흐르는 풍경",
    "titleEn": "Layered Journey",
    "description": "배경 레이어의 이동 속도를 다르게 설정해 깊이를 만듭니다. 캐릭터 뒤의 풍경이 흘러가며 장면에 공간감을 더합니다.",
    "category": "캐릭터",
    "tags": [
      "character",
      "parallax",
      "layers"
    ],
    "theme": "grid",
    "seed": 11,
    "coverLabel": "PARALLAX LAYERS",
    "sourceTitle": "패럴랙스 장면",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#44",
    "package": "캐릭터 PNG",
    "codeFile": "/motion-library/codes/44.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "45",
    "title": "나를 소개하는 한 장",
    "titleEn": "Presenter Portrait",
    "description": "캐릭터 이미지와 소개 문구를 프로필 카드에 모읍니다. 강의나 발표 영상의 인물 소개 화면으로 참고할 수 있습니다.",
    "category": "캐릭터",
    "tags": [
      "profile",
      "character",
      "card"
    ],
    "theme": "collage",
    "seed": 12,
    "coverLabel": "PROFILE CARD",
    "sourceTitle": "강의 프로필 카드",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#45",
    "package": "캐릭터 PNG",
    "codeFile": "/motion-library/codes/45.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "46",
    "title": "우리 사이의 연결선",
    "titleEn": "Connected Cast",
    "description": "여러 캐릭터를 배치하고 선으로 관계를 이어 줍니다. 개별 인물이 하나의 그룹으로 읽히는 등장 순서를 살펴봅니다.",
    "category": "캐릭터",
    "tags": [
      "character",
      "network",
      "paths"
    ],
    "theme": "orbit",
    "seed": 13,
    "coverLabel": "CHARACTER NETWORK",
    "sourceTitle": "캐릭터 군단 연결",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#46",
    "package": "캐릭터 PNG",
    "codeFile": "/motion-library/codes/46.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "47",
    "title": "톡 붙이는 캐릭터",
    "titleEn": "Sticker Studio",
    "description": "투명 배경 캐릭터의 외곽에 선과 효과를 둘러 스티커처럼 만듭니다. 이미지의 존재감을 또렷하게 만드는 표현입니다.",
    "category": "캐릭터",
    "tags": [
      "character",
      "outline",
      "effects"
    ],
    "theme": "collage",
    "seed": 14,
    "coverLabel": "STICKER OUTLINE",
    "sourceTitle": "스티커 효과",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#47",
    "package": "캐릭터 PNG",
    "codeFile": "/motion-library/codes/47.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "01a",
    "title": "프레임에서 움직임으로",
    "titleEn": "Frame Playground",
    "description": "프레임 값의 변화와 스프링 반응을 연결해 기본 동작을 만듭니다. 위치와 크기 변화의 감각을 익히는 출발점입니다.",
    "category": "기초 구성",
    "tags": [
      "core",
      "frames",
      "spring"
    ],
    "theme": "orbit",
    "seed": 15,
    "coverLabel": "SPRING & INTERPOLATE",
    "sourceTitle": "애니메이션 기초",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#01a",
    "package": "remotion (코어)",
    "codeFile": "/motion-library/codes/01a.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "01b",
    "title": "시간을 블록처럼",
    "titleEn": "Timeline Blocks",
    "description": "장면을 시작하고 이어 붙이고 반복하거나 멈추는 흐름을 정리합니다. 여러 동작을 하나의 타임라인에 배치하는 방법입니다.",
    "category": "기초 구성",
    "tags": [
      "sequence",
      "series",
      "loop"
    ],
    "theme": "grid",
    "seed": 16,
    "coverLabel": "SEQUENCE / LOOP",
    "sourceTitle": "시간 배치: Sequence · Series · Loop · Freeze",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#01b",
    "package": "remotion (코어)",
    "codeFile": "/motion-library/codes/01b.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "01c",
    "title": "이미지와 소리를 한 컷에",
    "titleEn": "Media Mix",
    "description": "이미지·영상·오디오를 한 구성에 넣고 색 변화도 더합니다. 여러 종류의 미디어를 함께 다루는 기본 구성을 살펴봅니다.",
    "category": "기초 구성",
    "tags": [
      "image",
      "video",
      "audio"
    ],
    "theme": "collage",
    "seed": 17,
    "coverLabel": "MEDIA MIX",
    "sourceTitle": "미디어 넣기: Img · OffthreadVideo · Audio · random · interpolateColors",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#01c",
    "package": "remotion (코어)",
    "codeFile": "/motion-library/codes/01c.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "02",
    "title": "장면 사이를 건너기",
    "titleEn": "Scene Bridge",
    "description": "앞 장면에서 다음 장면으로 자연스럽게 넘어갑니다. 전환 효과와 장면 길이가 영상의 리듬에 주는 차이를 확인합니다.",
    "category": "화면 효과",
    "tags": [
      "transition",
      "sequence",
      "scenes"
    ],
    "theme": "grid",
    "seed": 18,
    "coverLabel": "SCENE TRANSITION",
    "sourceTitle": "장면 전환",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#02",
    "package": "@remotion/transitions",
    "codeFile": "/motion-library/codes/02.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "03",
    "title": "따뜻한 빛이 스미면",
    "titleEn": "Amber Flare",
    "description": "화면 위로 빛이 번지는 레이어를 겹칩니다. 피사체를 바꾸지 않고도 장면의 분위기를 조절하는 방법입니다.",
    "category": "화면 효과",
    "tags": [
      "light",
      "overlay",
      "film"
    ],
    "theme": "particles",
    "seed": 19,
    "coverLabel": "LIGHT LEAK",
    "sourceTitle": "빛 번짐",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#03",
    "package": "@remotion/light-leaks",
    "codeFile": "/motion-library/codes/03.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "04",
    "title": "중심에서 퍼지는 에너지",
    "titleEn": "Ray Field",
    "description": "중앙에서 뻗어 나가는 광선으로 배경에 방향성을 줍니다. 시선을 가운데로 모으는 역동적인 패턴입니다.",
    "category": "화면 효과",
    "tags": [
      "rays",
      "background",
      "starburst"
    ],
    "theme": "orbit",
    "seed": 20,
    "coverLabel": "RADIAL STARBURST",
    "sourceTitle": "방사형 광선 배경",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#04",
    "package": "@remotion/starburst",
    "codeFile": "/motion-library/codes/04.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "05a",
    "title": "화면 질감 실험실",
    "titleEn": "Filter Lab",
    "description": "효과 속성을 조절하며 화면의 인상이 바뀌는 과정을 살펴봅니다. 필터를 조합하기 전 기본 구조를 익히는 예시입니다.",
    "category": "화면 효과",
    "tags": [
      "effects",
      "filters",
      "gpu"
    ],
    "theme": "grid",
    "seed": 21,
    "coverLabel": "EFFECTS EXPLORER",
    "sourceTitle": "이펙트 기초",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#05a",
    "package": "@remotion/effects",
    "codeFile": "/motion-library/codes/05a.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "05b",
    "title": "발표 장면의 한 끗",
    "titleEn": "Picture Polish",
    "description": "인물 중심 영상에 여러 효과를 조합해 마무리합니다. 발표 화면의 질감과 강조점을 다듬는 구성을 참고합니다.",
    "category": "화면 효과",
    "tags": [
      "effects",
      "presenter",
      "video"
    ],
    "theme": "collage",
    "seed": 22,
    "coverLabel": "PRESENTER POLISH",
    "sourceTitle": "강의 영상 실전 레시피",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#05b",
    "package": "@remotion/effects",
    "codeFile": "/motion-library/codes/05b.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "06",
    "title": "속도가 남긴 흔적",
    "titleEn": "Speed Trails",
    "description": "빠르게 움직이는 요소 뒤에 흐릿한 잔상을 더합니다. 정지된 한 프레임에도 이동 방향과 속도감이 드러납니다.",
    "category": "화면 효과",
    "tags": [
      "blur",
      "motion",
      "speed"
    ],
    "theme": "orbit",
    "seed": 23,
    "coverLabel": "MOTION BLUR",
    "sourceTitle": "모션 블러",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#06",
    "package": "@remotion/motion-blur",
    "codeFile": "/motion-library/codes/06.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "07",
    "title": "규칙 없이 부드럽게",
    "titleEn": "Gentle Drift",
    "description": "노이즈 값을 활용해 자연스럽게 이어지는 움직임을 만듭니다. 반복이 지나치게 기계적으로 느껴지지 않도록 흐름을 조율합니다.",
    "category": "도형·모션",
    "tags": [
      "noise",
      "random",
      "motion"
    ],
    "theme": "particles",
    "seed": 24,
    "coverLabel": "ORGANIC NOISE",
    "sourceTitle": "자연스러운 랜덤 움직임",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#07",
    "package": "@remotion/noise",
    "codeFile": "/motion-library/codes/07.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "08",
    "title": "선을 따라가는 시간",
    "titleEn": "Path Tracer",
    "description": "SVG 경로가 그려지거나 요소가 그 길을 따라 움직입니다. 복잡한 이동을 하나의 곡선으로 설계하는 아이디어입니다.",
    "category": "도형·모션",
    "tags": [
      "svg",
      "path",
      "drawing"
    ],
    "theme": "orbit",
    "seed": 25,
    "coverLabel": "SVG PATH DRAWING",
    "sourceTitle": "SVG 경로 애니메이션",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#08",
    "package": "@remotion/paths",
    "codeFile": "/motion-library/codes/08.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "09",
    "title": "도형으로 만드는 장면",
    "titleEn": "Shape Kit",
    "description": "기본 도형을 조합해 그래픽 구성을 만듭니다. 크기와 배치, 색의 대비만으로 리듬을 만드는 예시입니다.",
    "category": "도형·모션",
    "tags": [
      "shapes",
      "svg",
      "geometry"
    ],
    "theme": "grid",
    "seed": 26,
    "coverLabel": "GEOMETRIC SHAPES",
    "sourceTitle": "기본 도형 컴포넌트",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#09",
    "package": "@remotion/shapes",
    "codeFile": "/motion-library/codes/09.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "10",
    "title": "벡터의 입체 회전",
    "titleEn": "Vector Turntable",
    "description": "SVG 그래픽을 입체적으로 회전시켜 여러 각도에서 보여 줍니다. 평면 그림을 공간 안의 오브젝트처럼 다루는 표현입니다.",
    "category": "도형·모션",
    "tags": [
      "svg",
      "3d",
      "rotation"
    ],
    "theme": "orbit",
    "seed": 27,
    "coverLabel": "SVG IN 3D",
    "sourceTitle": "SVG를 3D로 돌리기",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#10",
    "package": "@remotion/svg-3d-engine",
    "codeFile": "/motion-library/codes/10.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "11",
    "title": "스타일이 변하는 순간",
    "titleEn": "Style Morph",
    "description": "여러 스타일 값을 함께 보간해 요소의 모양과 인상을 바꿉니다. 개별 속성이 하나의 전환으로 연결되는 과정을 살펴봅니다.",
    "category": "도형·모션",
    "tags": [
      "style",
      "interpolation",
      "animation"
    ],
    "theme": "grid",
    "seed": 28,
    "coverLabel": "STYLE INTERPOLATION",
    "sourceTitle": "스타일 통째로 보간",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#11",
    "package": "@remotion/animation-utils",
    "codeFile": "/motion-library/codes/11.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "12",
    "title": "중요한 말에 한 줄",
    "titleEn": "Marker Notes",
    "description": "밑줄과 동그라미 같은 손그림 표시로 텍스트를 강조합니다. 읽는 순서에 맞춰 포인트를 드러내는 방식입니다.",
    "category": "타이포그래피",
    "tags": [
      "text",
      "annotation",
      "highlight"
    ],
    "theme": "editorial",
    "seed": 29,
    "coverLabel": "HAND-DRAWN EMPHASIS",
    "sourceTitle": "손그림 강조 표시",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#12",
    "package": "@remotion/rough-notation",
    "codeFile": "/motion-library/codes/12.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "13",
    "title": "문장에 꼭 맞는 말풍선",
    "titleEn": "Caption Clouds",
    "description": "여러 줄 자막의 폭을 따라 둥근 배경을 만듭니다. 글의 모양에 맞춰 자막 박스를 정리하는 표현입니다.",
    "category": "타이포그래피",
    "tags": [
      "captions",
      "text",
      "layout"
    ],
    "theme": "editorial",
    "seed": 30,
    "coverLabel": "ROUNDED CAPTIONS",
    "sourceTitle": "틱톡 스타일 자막 박스",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#13",
    "package": "@remotion/rounded-text-box",
    "codeFile": "/motion-library/codes/13.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "14",
    "title": "말의 박자대로",
    "titleEn": "Word Pulse",
    "description": "발화 타이밍에 맞춰 단어를 보여 주고 강조합니다. 짧은 영상에서 말의 리듬과 시각적 포인트를 연결합니다.",
    "category": "타이포그래피",
    "tags": [
      "captions",
      "timing",
      "vertical"
    ],
    "theme": "kinetic",
    "seed": 31,
    "coverLabel": "WORD-BY-WORD",
    "sourceTitle": "쇼츠식 자막",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#14",
    "package": "@remotion/captions",
    "codeFile": "/motion-library/codes/14.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "15",
    "title": "글자가 자리 잡는 법",
    "titleEn": "Perfect Fit",
    "description": "주어진 영역에 맞춰 텍스트 크기와 배치를 계산합니다. 문구 길이가 달라도 안정적인 구도를 유지하는 방식입니다.",
    "category": "타이포그래피",
    "tags": [
      "text",
      "measure",
      "layout"
    ],
    "theme": "editorial",
    "seed": 32,
    "coverLabel": "TEXT THAT FITS",
    "sourceTitle": "글자 크기 재고 자동 맞추기",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#15",
    "package": "@remotion/layout-utils",
    "codeFile": "/motion-library/codes/15.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "16",
    "title": "서체로 바꾸는 분위기",
    "titleEn": "Font Sampler",
    "description": "Google Fonts를 불러와 텍스트에 적용합니다. 같은 문구도 서체에 따라 달라지는 인상을 비교할 수 있습니다.",
    "category": "타이포그래피",
    "tags": [
      "fonts",
      "typography",
      "google"
    ],
    "theme": "editorial",
    "seed": 33,
    "coverLabel": "GOOGLE FONT STUDY",
    "sourceTitle": "구글 폰트 한 줄로 쓰기",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#16",
    "package": "@remotion/google-fonts",
    "codeFile": "/motion-library/codes/16.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "17",
    "title": "나만의 글꼴 불러오기",
    "titleEn": "Custom Type",
    "description": "별도로 준비한 폰트 파일을 로드해 장면에 사용합니다. 프로젝트의 서체를 일관되게 적용하는 기본 구성입니다.",
    "category": "타이포그래피",
    "tags": [
      "fonts",
      "typography",
      "assets"
    ],
    "theme": "editorial",
    "seed": 34,
    "coverLabel": "CUSTOM FONT FILE",
    "sourceTitle": "내 폰트 파일 불러오기",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#17",
    "package": "@remotion/fonts",
    "codeFile": "/motion-library/codes/17.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "18",
    "title": "표정이 움직이는 순간",
    "titleEn": "Emoji Parade",
    "description": "움직이는 이모지를 장면에 더해 감정을 표현합니다. 짧은 반응을 시각적으로 전하는 작은 장치입니다.",
    "category": "미디어",
    "tags": [
      "emoji",
      "animation",
      "assets"
    ],
    "theme": "collage",
    "seed": 35,
    "coverLabel": "ANIMATED EMOJI",
    "sourceTitle": "움직이는 이모지",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#18",
    "package": "@remotion/animated-emoji",
    "codeFile": "/motion-library/codes/18.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "19",
    "title": "커서가 알려 주는 길",
    "titleEn": "Pointer Story",
    "description": "포인터의 이동으로 화면 속 동작을 안내합니다. 기능 시연이나 사용법 영상에서 클릭 지점을 또렷하게 보여 줍니다.",
    "category": "미디어",
    "tags": [
      "cursor",
      "interface",
      "demo"
    ],
    "theme": "terminal",
    "seed": 36,
    "coverLabel": "CURSOR DEMO",
    "sourceTitle": "맥 마우스 커서",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#19",
    "package": "@remotion/mac-cursors",
    "codeFile": "/motion-library/codes/19.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "20",
    "title": "프레임에 맞춘 타임라인",
    "titleEn": "Timeline Sync",
    "description": "GSAP 애니메이션의 진행을 영상 프레임과 맞춥니다. 타임라인 기반 동작을 영상 제작 흐름으로 연결하는 예시입니다.",
    "category": "미디어",
    "tags": [
      "gsap",
      "timeline",
      "frames"
    ],
    "theme": "terminal",
    "seed": 37,
    "coverLabel": "GSAP FRAME SYNC",
    "sourceTitle": "GSAP 타임라인",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#20",
    "package": "@remotion/gsap",
    "codeFile": "/motion-library/codes/20.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "21",
    "title": "벡터 애니메이션 연결",
    "titleEn": "Vector Playback",
    "description": "Lottie 애니메이션을 영상의 시간 흐름에 맞춰 재생합니다. 기존 벡터 모션을 한 장면의 재료로 활용합니다.",
    "category": "미디어",
    "tags": [
      "lottie",
      "json",
      "animation"
    ],
    "theme": "collage",
    "seed": 38,
    "coverLabel": "LOTTIE PLAYBACK",
    "sourceTitle": "로티 애니메이션",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#21",
    "package": "@remotion/lottie",
    "codeFile": "/motion-library/codes/21.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "22",
    "title": "짧은 순간을 반복 재생",
    "titleEn": "Looped Moment",
    "description": "GIF의 재생을 영상 구성 안에서 제어합니다. 반복되는 이미지 클립을 다른 장면 요소와 함께 배치합니다.",
    "category": "미디어",
    "tags": [
      "gif",
      "media",
      "loop"
    ],
    "theme": "grid",
    "seed": 39,
    "coverLabel": "GIF LOOP",
    "sourceTitle": "GIF 재생",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#22",
    "package": "@remotion/gif",
    "codeFile": "/motion-library/codes/22.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "23",
    "title": "소리를 눈으로 보다",
    "titleEn": "Sound Spectrum",
    "description": "오디오 데이터를 그래픽으로 바꿔 보여 줍니다. 소리의 변화에 맞춰 움직이는 시각 요소를 구성합니다.",
    "category": "미디어",
    "tags": [
      "audio",
      "waveform",
      "visualizer"
    ],
    "theme": "data",
    "seed": 40,
    "coverLabel": "AUDIO SPECTRUM",
    "sourceTitle": "오디오 비주얼라이저",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#23",
    "package": "@remotion/media-utils",
    "codeFile": "/motion-library/codes/23.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "24",
    "title": "움직임에 소리 한 점",
    "titleEn": "Sound Accents",
    "description": "화면의 강조 순간에 효과음을 배치합니다. 등장과 전환에 청각적인 리듬을 더하는 아이디어입니다.",
    "category": "미디어",
    "tags": [
      "audio",
      "sfx",
      "timing"
    ],
    "theme": "data",
    "seed": 41,
    "coverLabel": "SOUND ACCENTS",
    "sourceTitle": "효과음 모음",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#24",
    "package": "@remotion/sfx",
    "codeFile": "/motion-library/codes/24.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "27",
    "title": "클립을 이어 한 편으로",
    "titleEn": "Clip Workshop",
    "description": "영상과 오디오 요소를 조합해 편집 장면을 만듭니다. 미디어를 다루는 구성 요소의 연결 방식을 살펴봅니다.",
    "category": "미디어",
    "tags": [
      "video",
      "audio",
      "webcodecs"
    ],
    "theme": "terminal",
    "seed": 42,
    "coverLabel": "MEDIA EDIT",
    "sourceTitle": "영상·소리 편집",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#27",
    "package": "@remotion/media",
    "codeFile": "/motion-library/codes/27.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "25",
    "title": "영상 안의 작은 3D 무대",
    "titleEn": "Depth Stage",
    "description": "Three.js 장면을 영상 구성에 연결합니다. 조명과 카메라, 입체 오브젝트를 함께 다루는 출발점입니다.",
    "category": "심화 활용",
    "tags": [
      "threejs",
      "3d",
      "scene"
    ],
    "theme": "orbit",
    "seed": 43,
    "coverLabel": "THREE.JS STAGE",
    "sourceTitle": "3D 장면",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#25",
    "package": "@remotion/three",
    "codeFile": "/motion-library/codes/25.tsx",
    "codeLanguage": "tsx"
  },
  {
    "id": "31",
    "title": "클립의 속성 읽기",
    "titleEn": "Clip Inspector",
    "description": "미디어 파일에서 기술적인 정보를 추출합니다. 화면 애니메이션 대신 파일의 메타데이터를 확인하는 Node.js 예시입니다.",
    "category": "심화 활용",
    "tags": [
      "metadata",
      "parser",
      "media"
    ],
    "theme": "terminal",
    "seed": 44,
    "coverLabel": "MEDIA METADATA / NODE",
    "sourceTitle": "영상 정보 읽기",
    "sourceUrl": "https://www.aicitybuilders.com/remotion#31",
    "package": "@remotion/media-parser",
    "codeFile": "/motion-library/codes/31.mjs",
    "codeLanguage": "mjs"
  }
];

export function filterMotionItems(items: MotionItem[], category: string, query: string) {
  const q = query.trim().toLowerCase();
  return items.filter(item => (!category || item.category === category) && (!q || [item.title, item.titleEn, item.description, item.sourceTitle, item.package, ...item.tags].some(text => text.toLowerCase().includes(q))));
}
