# 03. 디자인 시스템 (시안 재현 기준)

> **원칙: 첨부 시안을 "그대로 카피하는 수준"으로 재현합니다.**
> 시안 원본은 `design/reference/home-desktop-mobile.png`에 보관합니다. 모든 화면은 이 이미지와 나란히 놓고 비교합니다.
> 아래 수치는 시안 스크린샷에서 **측정·추출한 근사값**입니다. 원본 디자인 파일(Figma 등)이 있으면 그 값이 우선합니다.

---

## 1. 디자인 토큰

### 1.1 컬러 (Light)

시안 픽셀에서 추출한 값을 정리했습니다. 안티앨리어싱 때문에 ±5% 정도 오차가 있을 수 있습니다.

```css
:root {
  /* 브랜드 — 회원가입 버튼, 활성 메뉴 밑줄, 캐러셀 활성 점 */
  --color-brand:            #D9411E;
  --color-brand-hover:      #C2361A;
  --color-brand-soft:       #FDEDE8;   /* 브랜드 연한 배경 */
  --color-brand-soft-strong:#F4A48E;   /* 로고 보조 원 */

  /* 배경 */
  --color-bg-page:          #F7F7F8;   /* 섹션 사이 페이지 배경 */
  --color-bg-surface:       #FFFFFF;   /* 카드, 헤더 */
  --color-bg-subtle:        #F3F4F6;   /* 입력창, 썸네일 자리 */

  /* 텍스트 */
  --color-text-strong:      #111114;   /* 제목, 로고 CO */
  --color-text-body:        #33363B;   /* 본문 */
  --color-text-muted:       #6B7078;   /* 날짜, 조회수 (시안 #787D84 → AA 대비 확보 위해 조정) */
  --color-text-inverse:     #FFFFFF;

  /* 선 */
  --color-border:           #E6E7EA;
  --color-border-strong:    #D1D4D9;

  /* 히어로 포스터 테마 (배지·제목·버튼) */
  --poster-event-bg:        #FCE9DF;   --poster-event-accent:   #C8250E;  /* 이벤트(주황/빨강) */
  --poster-feature-bg:      #E3EEFB;   --poster-feature-accent: #1A2F9E;  /* 특집(파랑) */
  --poster-challenge-bg:    #E4F4EA;   --poster-challenge-accent:#0B5A3A; /* 이벤트(초록) */
  --poster-news-bg:         #E8E9FB;   --poster-news-accent:    #2A2CB8;  /* 뉴스(보라/남색) */

  /* 카테고리 태그 (프롬프트, 커뮤니티 말머리) */
  --tag-general-fg: #21763A;  --tag-general-bg: #E3F4E8;   /* 일반 */
  --tag-qna-fg:     #225BE0;  --tag-qna-bg:     #E4ECFD;   /* 질문 */
  --tag-tip-fg:     #532FD6;  --tag-tip-bg:     #ECE7FC;   /* 활용팁 */
  --tag-work-fg:    #6A4BD8;  --tag-work-bg:    #EFEAFD;   /* 업무·생산성 */
  --tag-image-fg:   #C2410C;  --tag-image-bg:   #FDECE3;   /* 이미지·디자인 */
  --tag-code-fg:    #15803D;  --tag-code-bg:    #E5F5EA;   /* 개발·코딩 */

  /* 프롬프트 아이콘 타일 */
  --icon-tile-blue:   #E8F0FE;  --icon-blue:   #2563EB;
  --icon-tile-purple: #F1E8FE;  --icon-purple: #9333EA;
  --icon-tile-green:  #E6F6EC;  --icon-green:  #16A34A;

  /* 상태 */
  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-danger:  #DC2626;
  --color-focus:   #2563EB;
}
```

### 1.2 컬러 (Dark)

시안에는 다크 모드가 없으므로 **같은 구조를 유지하면서 명도만 반전**합니다. 브랜드색은 다크 배경에서 대비를 맞추기 위해 한 단계 밝게 씁니다.

```css
:root[data-theme="dark"] {
  --color-brand:            #F0603C;
  --color-brand-hover:      #FF7650;
  --color-brand-soft:       #3A1F18;
  --color-brand-soft-strong:#9C4A35;

  --color-bg-page:          #0F1013;
  --color-bg-surface:       #181A1F;
  --color-bg-subtle:        #22252B;

  --color-text-strong:      #F4F5F7;
  --color-text-body:        #D3D6DB;
  --color-text-muted:       #9CA1AA;

  --color-border:           #2A2D34;
  --color-border-strong:    #3A3E46;

  --poster-event-bg:     #3A2119;  --poster-event-accent:    #FF8A6A;
  --poster-feature-bg:   #182544;  --poster-feature-accent:  #8FB0FF;
  --poster-challenge-bg: #132E22;  --poster-challenge-accent:#6FD3A0;
  --poster-news-bg:      #1E1E45;  --poster-news-accent:     #A5A7FF;

  --tag-general-bg:#173322; --tag-general-fg:#7BD69A;
  --tag-qna-bg:    #18264A; --tag-qna-fg:    #8FB0FF;
  --tag-tip-bg:    #261E4A; --tag-tip-fg:    #B9A6FF;
  /* 나머지 태그·아이콘 타일도 같은 규칙(bg는 어둡게, fg는 밝게)으로 정의 */
}
```

- 포스터 이미지(3D 일러스트)는 다크 모드에서도 원본을 그대로 쓰고, 카드 배경만 토큰으로 바꿉니다. 포스터 이미지 자체에 배경이 포함돼 있으면 `filter: brightness(0.92)` 정도만 적용합니다.
- 컴포넌트 안에서 `#hex` 값을 직접 쓰는 것은 **금지**입니다. 반드시 `var(--token)` 또는 Tailwind 매핑 클래스를 씁니다.

### 1.3 타이포그래피

- 폰트: **Pretendard** (웹폰트, 가변 굵기). 대체 글꼴: `-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`
- 영어(en) 로케일에서도 Pretendard를 그대로 씁니다 (라틴 글리프 포함).

| 토큰 | 용도 (시안 위치) | PC | 모바일 | 굵기 | 행간 |
|---|---|---|---|---|---|
| `display` | 히어로 포스터 제목 | 34px | 22px | 800 | 1.25 |
| `h1` | 페이지 제목 | 28px | 22px | 700 | 1.35 |
| `h2` | 섹션 제목 ("최신 뉴스") | 22px | 18px | 700 | 1.4 |
| `title` | 카드 제목 | 17px | 16px | 700 | 1.45 |
| `body` | 본문, 카드 설명 | 16px | 15px | 400 | 1.6 |
| `meta` | 날짜, 조회수, 댓글 수 | 14px | 13px | 400 | 1.4 |
| `badge` | 배지, 태그 | 12px | 12px | 600 | 1 |
| `nav` | GNB 메뉴 | 16px | 15px | 600 | 1 |

> 시안의 보조 텍스트는 12~13px 정도로 보입니다. 대상 연령을 고려해 **본문 16px, 메타 14px을 최소값**으로 정했습니다. 레이아웃 비율은 시안과 같게 유지합니다.

### 1.4 간격 · 모서리 · 그림자

```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
--space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px;

--radius-sm: 6px;    /* 태그, 배지 */
--radius-md: 10px;   /* 버튼, 입력창, 썸네일 */
--radius-lg: 14px;   /* 카드, 도구 타일 */
--radius-xl: 18px;   /* 히어로 포스터, 섹션 패널 */
--radius-full: 999px;/* 포스터 CTA 버튼, 캐러셀 화살표, 검색창 */

--shadow-card:  0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06);
--shadow-hover: 0 6px 16px rgba(16,24,40,.10);
--shadow-arrow: 0 2px 8px rgba(16,24,40,.15);
```

### 1.5 레이아웃 그리드

| 항목 | PC (≥1280) | 태블릿 (768~1279) | 모바일 (<768) |
|---|---|---|---|
| 콘텐츠 최대 너비 | 1200px | 100% − 48px | 100% − 32px |
| 좌우 여백 | 자동 중앙 정렬 | 24px | 16px |
| 컬럼 | 12 | 8 | 4 |
| 컬럼 간격 | 24px | 20px | 12px |

브레이크포인트(Tailwind): `sm 640 / md 768 / lg 1024 / xl 1280`

---

## 2. 홈 화면 레이아웃 (시안 1:1 재현)

### 2.1 헤더 (PC)
- 높이 **72px**, 배경 `--color-bg-surface`, 하단 1px `--color-border`, 스크롤하면 상단 고정(sticky) + `--shadow-card`
- 왼쪽: 로고(심볼 28px + 워드마크 26px) → 12px 간격 → 태그라인(`meta`, `--color-text-muted`)
- 가운데: GNB. 메뉴 사이 간격 32px. **활성 메뉴는 텍스트 `--color-brand` + 하단 3px 밑줄(너비는 텍스트와 같음, 헤더 하단에 붙음)**
- 오른쪽: 검색창(너비 200px, 높이 40px, `radius-md`, 왼쪽 돋보기 아이콘, placeholder "궁금한 내용을 검색해보세요.") → 로그인(외곽선 버튼) → 회원가입(브랜드 채움 버튼). 버튼 높이 40px, 좌우 패딩 16px
- **추가 요소(시안에 없음)**: 회원가입 버튼 오른쪽에 테마 토글(☀/☾ 아이콘 버튼 36px)과 언어 선택(🌐 KO ▾)을 둡니다. 시안의 버튼과 같은 높이·외곽선 스타일을 씁니다.
- 로그인 후: 로그인·회원가입 자리에 알림 벨 + 아바타(36px 원형) 드롭다운이 들어갑니다.

### 2.2 히어로 포스터 캐러셀
- 상단 여백 24px, 페이지 배경 위에 배치
- **한 화면에 포스터 4장(PC), 2장(모바일, 다음 카드 일부 노출)**, 카드 간격 16px (모바일 12px)
- 포스터 카드
  - 비율 **약 11:16 (세로형)**, `radius-xl`, 배경 = 포스터 테마 bg
  - 안쪽 여백 24px (모바일 16px)
  - 위에서부터: 배지 → 12px → 제목(`display`, 2줄, 테마 accent 색) → 12px → 설명(`body`, 2줄) → 16px → CTA 버튼 → 하단에 일러스트 이미지(카드 아래쪽 약 45% 영역)
  - 배지: 높이 24px, `radius-sm`, 테마 accent 배경 + 흰 글씨 (이벤트·특집·뉴스)
  - CTA: 높이 40px, `radius-full`, 테마 accent 배경 + 흰 글씨 + 오른쪽 `›` 아이콘
- 좌우 화살표: 지름 44px 흰 원, `--shadow-arrow`, 카드 영역 바깥 가장자리에 세로 중앙으로 겹치게 배치
- 페이지 점: 캐러셀 아래 16px, 점 8px, 간격 8px, 활성 점은 `--color-brand`, 나머지는 `--color-border-strong`
- 동작: 5초 자동 넘김, 마우스를 올리거나 포커스가 가면 멈춤, 터치 스와이프, `prefers-reduced-motion`이면 자동 넘김 끔
- 데이터: 어드민 > 배너 관리에서 등록 (`banners` 컬렉션, docs/06)

### 2.3 섹션 패널 3열 (최신 뉴스 / 추천 프롬프트 / 가이드 서비스)
- 캐러셀 아래 32px, PC 3열(간격 24px), 태블릿 2열, 모바일 1열
- 패널: `--color-bg-surface`, `radius-xl`, 패딩 24px
- 패널 헤더: 섹션 제목(`h2`) 왼쪽, "더보기 ›"(`meta`, muted) 오른쪽, 아래 16px

**① 최신 뉴스 항목** (3개)
- 가로 배치: 썸네일 **112×84px**, `radius-md` → 16px → 텍스트
- 텍스트: 제목(`title`, 2줄 말줄임) / 요약(`meta`, 1줄) / 하단 줄: 날짜(왼쪽) + 💬 댓글 수(오른쪽)
- 항목 사이 1px 구분선, 위아래 16px 여백

**② 추천 프롬프트 항목** (3개)
- 카드형: 1px `--color-border`, `radius-lg`, 패딩 16px, 카드 간격 12px
- 왼쪽 아이콘 타일 **56×56px**, `radius-lg`, 카테고리별 색(파랑 문서, 보라 이미지, 초록 코드)
- 오른쪽: 카테고리 태그 → 제목(`title`) → 설명(`meta`, 2줄) → 하단 줄: 👁 조회수, 💬 댓글 수, 오른쪽 끝에 **복사 아이콘 버튼(32px)**
- 복사 버튼을 누르면 프롬프트가 클립보드로 복사되고 "복사했어요" 토스트가 뜹니다.

**③ 가이드 서비스 타일** (6개, 2열×3행)
- 시안의 "바로 쓰는 AI 도구" 섹션입니다. 외부 서비스 소개이므로 섹션 이름은 **"AI 서비스 가이드"**(i18n 키 `home.guideServices`)로 바꾸고, 레이아웃은 그대로 둡니다.
- 타일: 1px border, `radius-lg`, 패딩 16px, 높이 72px
- 왼쪽 서비스 로고 36px → 12px → 이름(`title` 15px) + 한 줄 설명(`meta`) → 오른쪽 `›`
- 클릭하면 `/guide/services/[slug]`로 이동합니다.
- 서비스 로고는 각 회사의 브랜드 가이드라인을 확인한 뒤 사용합니다 (식별 목적의 사용).

### 2.4 커뮤니티 인기글
- 섹션 패널 1개, 패딩 24px. 안에 카드 3열(간격 16px), 모바일은 가로 스크롤
- 카드: 1px border, `radius-lg`, 패딩 16px, 오른쪽에 썸네일 **88×88px** `radius-md`
- 왼쪽 텍스트: 말머리 태그(일반·질문·활용팁) → 제목(`title`, 1줄) → 요약(`meta`, 2줄) → 하단 줄: ♡ 좋아요 수, 💬 댓글 수, 날짜

### 2.5 시안 외 추가 홈 섹션 (같은 컴포넌트 재사용)
시안 아래쪽에 이어 붙입니다. 새로운 스타일을 만들지 않고 위 패널·카드를 재사용합니다.
1. **만들어보기 인기작**: 커뮤니티 인기글 카드와 같은 형태. 썸네일 위에 ▶ "바로 실행" 배지
2. **바로쓰기**: 가이드 서비스 타일과 같은 형태 (QR, URL 단축, TTS …)
3. **다가오는 행사·스터디**: 히어로 포스터를 작게(4열) 만든 형태 + 날짜·장소·모집 상태 배지

### 2.6 모바일 홈 (시안 오른쪽 화면)
- 헤더 56px: 로고 왼쪽, 검색 아이콘 + 햄버거 오른쪽
- 헤더 아래 가로 스크롤 탭 48px (활성은 빨간 밑줄)
- 히어로: 카드 2장 + 다음 카드 일부 노출, 화살표는 작은 원(32px)
- 섹션: 1열로 쌓기. 섹션 사이에 8px 높이의 `--color-bg-page` 띠를 둡니다(시안처럼 회색 띠로 구분).
- 추천 프롬프트는 1개만, 가이드 서비스는 2열 타일 2개만 보이고 "더보기"로 이동
- **하단 탭 바**: 높이 64px + safe-area, 아이콘 24px + 라벨 12px, 활성은 `--color-brand`(아이콘 채움), 비활성은 muted

---

## 3. 공통 컴포넌트 목록

| 컴포넌트 | 변형 | 비고 |
|---|---|---|
| `Button` | primary(브랜드 채움), outline, ghost, pill(포스터 CTA) | 높이 sm 32 / md 40 / lg 48 |
| `IconButton` | 원형, 사각 | 복사, 테마 토글, 화살표 |
| `Badge` | poster(테마색), tag(카테고리색), status(모집중·마감·승인대기) | |
| `SectionPanel` | 제목 + 더보기 + 내용 | 홈과 목록 페이지 공통 |
| `PosterCard` | lg(히어로), sm(행사 목록) | 세로형 |
| `NewsItem` | 가로 썸네일형 | |
| `PromptCard` | compact(홈), gallery(결과물 이미지가 위에 오는 형태) | |
| `ToolTile` | 서비스 가이드, 바로쓰기 공용 | |
| `PostCard` | 썸네일 있음 / 없음 | |
| `BoardList` | 게시판 목록형 (번호·말머리·제목·작성자·날짜·조회·추천) | 커뮤니티 기본 보기 |
| `ViewToggle` | 목록형 ↔ 카드형 | 사용자의 선택을 기억 |
| `Carousel` | 포스터용 | 키보드 조작 가능 |
| `Modal` / `Sheet` | PC는 모달, 모바일은 바텀시트 | 샌드박스 실행 포함 |
| `Toast` | 성공, 오류 | |
| `EmptyState` | 일러스트 + 안내 문구 + 행동 버튼 | 빈 게시판 대응 |
| `ThemeToggle`, `LocaleSwitcher` | | docs/10 |
| `Avatar`, `LevelBadge` | 회원 등급 표시 | docs/07 |

아이콘: **lucide-react** (시안의 선형 아이콘과 같은 스타일, 1.75px 선 굵기)

## 4. 이미지 · 일러스트 규칙
- 히어로 포스터 일러스트는 시안과 같은 **부드러운 3D 클레이 스타일**(책상, 노트북, 화분, 3D "AI" 아이콘)로 통일합니다.
- 운영진이 배너를 등록할 때 쓸 수 있도록 같은 스타일의 이미지를 생성하는 프롬프트 템플릿을 어드민 > 배너 관리에 함께 둡니다.
- 썸네일: WebP, `next/image`로 최적화, 비율이 맞지 않으면 `object-fit: cover`

## 5. 시안 재현 체크리스트 (M1 완료 기준)
- [ ] 1440px 화면 캡처를 시안과 50% 투명도로 겹쳤을 때 주요 블록 위치 차이가 8px 이내
- [ ] 헤더 높이, 활성 메뉴 밑줄, 회원가입 버튼 색이 같음
- [ ] 포스터 4장, 세로형 비율, 배지·제목·CTA 색 구성이 같음
- [ ] 섹션 3열 패널의 썸네일, 아이콘 타일, 복사 버튼 위치가 같음
- [ ] 커뮤니티 인기글 카드 3열, 썸네일 오른쪽 배치가 같음
- [ ] 모바일(390px): 상단 탭, 히어로 2장, 회색 띠 구분, 하단 탭 5개
- [ ] 다크 모드에서도 같은 구조가 유지되고 대비 AA를 통과
