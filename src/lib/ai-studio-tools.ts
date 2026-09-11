export const AI_STUDIO_TOOLS = [
  { id: 'tool-tts', titleKo: 'TTS 메이커', descKo: 'Gemini 음성으로 자연스러운 내레이션을 제작합니다', icon: 'mic', status: 'new', features: ['Gemini TTS 음성 생성', '10개 음성 미리듣기', '최대 10,000자 대본', 'MP3 다운로드'] },
  { id: 'tool-storyboard', titleKo: '스토리보드 제너레이터', descKo: '영상 기획부터 컷 분할과 퍼스트프레임까지', icon: 'clapperboard', status: 'active', features: ['AI 스토리보드 설계', '컷·비트보드 분해', '퍼스트프레임 생성', '영상 모델 프롬프트'] },
  { id: 'tool-suno', titleKo: '수노 뮤직 메이커', descKo: 'AI 음악 프롬프트와 가사를 만듭니다', icon: 'music', status: 'new', features: ['Suno 스타일 프롬프트', '가사·제목 생성', 'BPM·무드 설정', '퍼블리싱 노트'] },
  { id: 'tool-metaprompt', titleKo: '메타 프롬프트', descKo: 'AI 인터뷰로 아이디어를 완성형 프롬프트로 만듭니다', icon: 'sparkles', status: 'new', features: ['대화형 요구사항 수집', '이미지·영상·음악 지원', '전문가 역할 프롬프트', '결과 복사·저장'] },
  { id: 'tool-detail', titleKo: '상세페이지 메이커', descKo: '상품 정보를 바탕으로 상세페이지를 설계합니다', icon: 'layout-panel-left', status: 'new', features: ['Style DNA', '리서치·카피 생성', '섹션별 이미지 프롬프트', '쇼핑몰 최적화'] },
  { id: 'tool-detail2', titleKo: '상세페이지 메이커 2', descKo: '12장 설득 구조의 상세페이지 제작 도구', icon: 'boxes', status: 'new', features: ['12장 구조 설계', '브랜드·모델 입력', '장면별 이미지 생성', '롱 캔버스 출력'] },
  { id: 'tool-converter', titleKo: '무료 변환기 모음', descKo: 'HEIC·이미지·PDF 파일을 브라우저에서 변환합니다', icon: 'refresh-cw', status: 'active', features: ['HEIC → JPG', '이미지 압축·리사이즈', '이미지 → PDF', 'PDF 병합'] },
  { id: 'tool-autocut', titleKo: '자동 컷편집', descKo: '영상 업로드 한 번으로 초벌편집과 자막을 만듭니다', icon: 'scissors', status: 'beta', features: ['Whisper 음성 인식', 'AI 하이라이트 추출', 'FFmpeg 컷편집', '자막 자동 삽입'] },
  { id: 'tool-srt', titleKo: 'SRT 자막 생성기', descKo: '대본과 오디오를 시간 자막으로 변환합니다', icon: 'file-text', status: 'new', features: ['Whisper 타임코드', '가사 정렬', 'SRT 다운로드', '한국어 최적화'] },
  { id: 'tool-url', titleKo: 'URL 단축기', descKo: '긴 주소를 짧은 링크로 만들고 클릭을 추적합니다', icon: 'link', status: 'new', features: ['커스텀 슬러그', '클릭 수 추적', '링크 관리', '공유'] },
  { id: 'tool-qr', titleKo: 'QR 코드 생성기', descKo: 'URL에서 QR 코드를 생성하고 저장합니다', icon: 'qr-code', status: 'new', features: ['QR 즉시 생성', 'PNG 다운로드', '생성 이력', '링크 관리'] },
  { id: 'tool-thumbnail', titleKo: '유튜브 썸네일 메이커', descKo: 'CTR을 고려한 유튜브 썸네일 프롬프트를 만듭니다', icon: 'image', status: 'new', features: ['CTR 요소 분석', '이미지 모델 프롬프트', '텍스트 오버레이', '플레이리스트 브랜딩'] },
] as const;
