// AI 서비스 사용설명서 catalogue, moved from the aiguidepage AI 전시관 (docs/coai/04 §6).
// Copy and categories follow that project's ko messages; brand marks live in
// public/coai/brands (see SOURCES.txt there).

export type GuideCategory = 'chat' | 'search' | 'documents' | 'image' | 'video' | 'music';

export const GUIDE_CATEGORIES: { id: GuideCategory | ''; label: string }[] = [
  { id: '', label: '전체' },
  { id: 'chat', label: '대화' },
  { id: 'search', label: '검색' },
  { id: 'documents', label: '문서' },
  { id: 'image', label: '이미지' },
  { id: 'video', label: '영상' },
  { id: 'music', label: '음악' },
];

export type GuideService = {
  id: string;
  name: string;
  url: string;
  logo: string;
  /** Cover palette key in guide.module.css (flow-music reuses flow). */
  cover: string;
  categories: GuideCategory[];
  /** Short label for the home tile and brand colour behind its white mark. */
  short: string;
  tile: string;
  summary: string;
  description: string;
  features: string[];
  prompt: string;
};

export const GUIDE_SERVICES: GuideService[] = [
  {
    id: 'claude', name: 'Claude', url: 'https://claude.ai', logo: 'claude-color.svg', cover: 'claude', categories: ['chat'],
    short: '문서·글쓰기', tile: '#D97757',
    summary: '복잡한 생각을 차분하게, 긴 글을 명료하게.',
    description: '문서를 함께 읽고, 생각을 정리하고, 글의 완성도를 높이는 대화 상대예요.',
    features: ['긴 문서의 핵심 요약', '자연스러운 글쓰기와 다듬기', '아이디어 정리와 코드 도움'],
    prompt: '동네 주민을 위한 AI 체험 행사 안내문을 써 줘. 쉽고 친근한 말투로, 준비물과 일정을 보기 좋게 정리해 줘.',
  },
  {
    id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', logo: 'openai.svg', cover: 'chatgpt', categories: ['chat', 'image'],
    short: '대화·글쓰기', tile: '#10A37F',
    summary: '궁금한 순간부터 새로운 아이디어까지.',
    description: '일상의 질문부터 글쓰기와 아이디어까지, 대화하며 함께 풀어가는 AI예요.',
    features: ['궁금한 점을 쉽게 설명', '글쓰기와 새로운 아이디어', '공부와 일상 계획 세우기'],
    prompt: 'AI를 처음 쓰는 사람에게 도움이 될 만한 활용법 5가지를 알려 줘. 일상 속 예시를 하나씩 붙여 줘.',
  },
  {
    id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', logo: 'gemini-color.svg', cover: 'gemini', categories: ['chat', 'image'],
    short: '멀티모달', tile: '#4F7BF7',
    summary: '일상의 궁금증에, 한 걸음 더 넓은 답.',
    description: '글과 이미지에 대해 질문하고, 새로운 아이디어를 탐색할 수 있는 Google의 AI예요.',
    features: ['글과 이미지 함께 이해하기', '아이디어 탐색과 글쓰기', '일상 속 정보 정리'],
    prompt: '주말에 제주에서 비가 와도 즐길 수 있는 실내 활동을 추천해 줘. 어르신과 함께 가기 편한 곳 위주로 알려 줘.',
  },
  {
    id: 'grok', name: 'Grok', url: 'https://grok.com', logo: 'grok.svg', cover: 'grok', categories: ['chat', 'image'],
    short: '관점 넓히기', tile: '#202324',
    summary: '새로운 관점이 필요할 때, 가볍게 대화.',
    description: '질문을 주고받으며 생각을 확장하고, 다양한 주제에 대한 관점을 살펴볼 수 있어요.',
    features: ['다양한 주제에 대해 대화', '아이디어와 관점 넓히기', '어려운 개념을 쉽게 이해'],
    prompt: '스마트폰을 처음 배우는 어르신을 위한 수업 아이디어를 5가지 제안해 줘. 재미있게 참여할 수 있는 활동이면 좋겠어.',
  },
  {
    id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', logo: 'perplexity.svg', cover: 'perplexity', categories: ['search'],
    short: '출처 검색', tile: '#1F8A8A',
    summary: '찾고, 읽고, 출처까지 한눈에.',
    description: '궁금한 내용을 검색하고, 답변과 함께 제시된 출처를 확인하며 더 깊이 알아보세요.',
    features: ['질문으로 시작하는 정보 검색', '답변의 출처 확인', '여러 자료를 모아 비교'],
    prompt: '제주도의 곶자왈이 무엇인지 알려 줘. 생태적 특징을 설명하고 참고할 수 있는 출처도 함께 보여 줘.',
  },
  {
    id: 'genspark', name: 'Genspark', url: 'https://www.genspark.ai', logo: 'genspark.svg', cover: 'genspark', categories: ['documents'],
    short: '조사·발표', tile: '#3B82C4',
    summary: '흩어진 정보를, 쓸모 있는 결과물로.',
    description: '조사할 내용을 정리하고, 문서와 발표를 위한 아이디어를 구체화해 보세요.',
    features: ['주제에 맞는 정보 조사', '문서와 발표 구성', '업무 아이디어 정리'],
    prompt: '지역 주민 대상 AI 기초 강좌 기획안을 만들어 줘. 4주 과정으로, 주차별 목표와 실습 내용을 정리해 줘.',
  },
  {
    id: 'notebooklm', name: 'NotebookLM', url: 'https://notebooklm.google.com', logo: 'notebooklm.svg', cover: 'notebooklm', categories: ['documents'],
    short: '내 자료 정리', tile: '#1F2937',
    summary: '내 자료를 가장 잘 아는 연구 파트너.',
    description: '내가 넣은 자료를 바탕으로 질문하고, 핵심 내용을 정리하며 이해를 깊게 할 수 있어요.',
    features: ['내 자료에 대한 질문과 답변', '여러 문서의 핵심 정리', '학습 자료 이해와 탐색'],
    prompt: '이 자료의 핵심 내용을 5가지로 요약해 줘. 처음 읽는 사람도 이해할 수 있게 쉬운 말로 설명해 줘.',
  },
  {
    id: 'flow', name: 'Google Flow', url: 'https://labs.google/fx/tools/flow', logo: 'google-color.svg', cover: 'flow', categories: ['video'],
    short: '영상 만들기', tile: '#5B7FD6',
    summary: '머릿속 장면을, 움직이는 이야기로.',
    description: '상상한 장면을 영상으로 표현하고, 아이디어를 시각적인 이야기로 발전시켜 보세요.',
    features: ['글로 영상 장면 구상하기', '분위기와 움직임 탐색', '짧은 영상 아이디어 제작'],
    prompt: '해 질 무렵 제주 바닷가, 바람에 천천히 흔들리는 억새와 잔잔한 파도. 따뜻하고 평온한 느낌의 영화 같은 장면.',
  },
  {
    id: 'suno', name: 'Suno', url: 'https://suno.com', logo: 'suno.svg', cover: 'suno', categories: ['music'],
    short: '노래 만들기', tile: '#7C5CE0',
    summary: '한 줄의 상상이, 나만의 음악이 되도록.',
    description: '원하는 분위기와 주제를 적어 나만의 노래를 만들어 보세요. 음악 경험이 없어도 시작할 수 있어요.',
    features: ['분위기에 맞는 노래 만들기', '가사 아이디어를 음악으로', '다양한 음악 장르 탐색'],
    prompt: '제주 바다를 산책하는 기분의 밝은 어쿠스틱 노래. 부드러운 기타와 따뜻한 목소리, 친구와 함께하는 소소한 행복을 담은 한국어 가사.',
  },
  {
    id: 'flow-music', name: 'Google Flow Music', url: 'https://flowmusic.google/', logo: 'google-color.svg', cover: 'flow-music', categories: ['music'],
    short: '연주곡 만들기', tile: '#5B7FD6',
    summary: '떠오른 멜로디를, 나만의 노래로.',
    description: 'Google의 음악 제작 도구예요. 원하는 장르와 분위기를 설명해 노래를 만들고, 가사와 편곡을 다듬어 보세요.',
    features: ['글·이미지·오디오로 음악 만들기', '가사와 악기, 곡 구성 다듬기', '완성한 곡 공유와 다운로드'],
    prompt: '제주 바닷가 카페에 어울리는 편안한 연주곡을 만들어 줘. 따뜻한 피아노와 잔잔한 기타, 느긋한 템포, 보컬 없이 1분 길이로.',
  },
];

/** Six services pinned to the home "AI 서비스 가이드" panel (docs/coai/04 §1). */
export const HOME_GUIDE_IDS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'notebooklm', 'suno'];

export const guideCategoryLabel = (id: GuideCategory) => GUIDE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
