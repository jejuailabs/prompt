# 10. 다국어 · 다크/라이트 모드 · 접근성

## Part A. 다국어 (i18n)

### A1. 기본 설정
- 라이브러리: **next-intl** (App Router 지원)
- 지원 언어: `ko`(기본), `en`. 추가 언어(ja, zh)는 미정 (ORCHESTRATION Q2)
- URL 방식: 경로 앞에 언어를 붙입니다 → `/ko/prompts`, `/en/prompts`
  - `/`로 들어오면 ① 로그인 회원의 저장된 언어 → ② `NEXT_LOCALE` 쿠키 → ③ 브라우저 `Accept-Language` → ④ `ko` 순서로 정해 이동합니다.
- `<html lang>`을 언어에 맞게 설정하고, 각 페이지에 `hreflang` 대체 링크를 넣습니다 (검색 노출).

### A2. 번역 대상 구분

| 구분 | 예 | 방식 |
|---|---|---|
| UI 문자열 | 메뉴, 버튼, 안내 문구, 에러 | `messages/{locale}.json` |
| 운영진 콘텐츠 | 배너, 이벤트, 가이드, 뉴스 요약 | 문서의 `i18n.{locale}` 필드. 영어가 없으면 한국어로 표시하고 "Korean only" 배지 |
| 회원 콘텐츠 | 프롬프트, 게시글, 댓글 | 번역하지 않고 원문 그대로. (선택) "번역 보기" 버튼으로 AI 번역 — 3단계 |
| 시스템 값 | 카테고리, 말머리, 등급 이름 | 저장은 코드값(`qna`), 표시는 메시지 키(`board.qna`) |

### A3. 메시지 파일 구조

```json
// messages/ko.json
{
  "brand": { "tagline": "쉽게 보고, 바로 써보는 AI 커뮤니티" },
  "nav": {
    "home": "홈", "news": "뉴스·이벤트", "prompts": "프롬프트", "make": "만들어보기",
    "tools": "바로쓰기", "guide": "가이드", "learn": "배우기", "community": "커뮤니티"
  },
  "header": { "searchPlaceholder": "궁금한 내용을 검색해보세요.", "login": "로그인", "signup": "회원가입" },
  "home": {
    "latestNews": "최신 뉴스", "featuredPrompts": "추천 프롬프트",
    "guideServices": "AI 서비스 가이드", "popularPosts": "커뮤니티 인기글", "more": "더보기"
  },
  "theme": { "toggle": "테마 바꾸기", "light": "라이트 모드", "dark": "다크 모드", "system": "시스템 설정" },
  "common": { "copy": "복사", "copied": "복사했어요", "run": "실행하기", "views": "조회 {count}", "comments": "댓글 {count}" }
}
```
```json
// messages/en.json
{
  "brand": { "tagline": "See it easily, try it instantly — an AI community" },
  "nav": {
    "home": "Home", "news": "News & Events", "prompts": "Prompts", "make": "Showcase",
    "tools": "Quick Tools", "guide": "Guides", "learn": "Learn", "community": "Community"
  },
  "header": { "searchPlaceholder": "Search anything…", "login": "Log in", "signup": "Sign up" },
  "home": {
    "latestNews": "Latest News", "featuredPrompts": "Featured Prompts",
    "guideServices": "AI Service Guides", "popularPosts": "Popular Posts", "more": "More"
  },
  "theme": { "toggle": "Toggle theme", "light": "Light", "dark": "Dark", "system": "System" },
  "common": { "copy": "Copy", "copied": "Copied", "run": "Run", "views": "{count} views", "comments": "{count} comments" }
}
```

### A4. 규칙
- 컴포넌트에 문자열을 직접 쓰지 않습니다: `t('header.login')`
- 숫자·날짜는 `useFormatter()`로 언어에 맞게 표시합니다 (ko `2026. 10. 21.` / en `Oct 21, 2026`, 조회수 ko `1.2만` / en `12K`).
- 영어는 한국어보다 길어지기 쉬우므로 메뉴·버튼은 **영어 기준으로 줄바꿈과 넘침**을 테스트합니다. PC GNB 8개 메뉴가 영어에서 넘치면 메뉴 간격을 줄이고, 그래도 넘치면 "More ▾"로 묶습니다.
- 언어 선택기(`LocaleSwitcher`): 헤더 오른쪽 `🌐 KO ▾`, 모바일은 햄버거 메뉴 안. 바꾸면 같은 페이지의 다른 언어 경로로 이동하고, 로그인 회원은 `users.locale`에 저장합니다.
- CI에서 `ko.json`과 `en.json`의 키가 서로 같은지 검사합니다 (빠진 키가 있으면 실패).

---

## Part B. 다크 / 라이트 모드

### B1. 구현
- 라이브러리: **next-themes**, `attribute="data-theme"`, `defaultTheme="system"`, `enableSystem`
- 토큰은 `docs/03`의 `:root`(light)와 `:root[data-theme="dark"]` 두 벌을 씁니다.
- Tailwind는 CSS 변수를 참조하도록 매핑합니다.
```js
// tailwind 설정 예시
colors: {
  brand: 'var(--color-brand)',
  page: 'var(--color-bg-page)',
  surface: 'var(--color-bg-surface)',
  strong: 'var(--color-text-strong)',
  body: 'var(--color-text-body)',
  muted: 'var(--color-text-muted)',
  line: 'var(--color-border)',
}
```
- `darkMode: ['class', '[data-theme="dark"]']`로 설정하되, **가능하면 `dark:` 접두사 대신 토큰만으로** 처리합니다 (같은 클래스가 양쪽 모드에서 자동 대응).

### B2. 토글 스위치 UI
- 위치: PC 헤더 오른쪽(회원가입 버튼 옆) / 모바일 햄버거 메뉴 상단
- 형태: 36px 원형 아이콘 버튼. 라이트일 때 ☾(달), 다크일 때 ☀(해) 아이콘을 보여줍니다. 아이콘이 바뀔 때 150ms 회전 + 페이드
- 길게 누르거나 드롭다운 화살표를 누르면 [라이트 / 다크 / 시스템] 3가지를 고를 수 있습니다.
- 로그인 회원은 `users.theme`에 저장하고, 다른 기기에서도 같은 설정을 씁니다.
- `aria-label={t('theme.toggle')}`, 현재 상태를 `aria-pressed`로 알려줍니다.

### B3. 깜빡임 방지
- next-themes의 기본 스크립트가 첫 화면이 그려지기 전에 테마를 적용합니다. `<html suppressHydrationWarning>`을 넣습니다.
- 테마에 따라 달라지는 아이콘은 마운트된 뒤에 그려서 서버/클라이언트 불일치를 막습니다.

### B4. 다크 모드 점검 항목
- [ ] 포스터 카드, 태그, 아이콘 타일이 다크 토큰으로 바뀌는가
- [ ] 이미지·썸네일 테두리가 배경과 구분되는가 (`--color-border`)
- [ ] 샌드박스 iframe 주변 테두리, 모달 배경 딤(`rgba(0,0,0,.6)`)
- [ ] 코드 블록·프롬프트 박스의 대비
- [ ] 로고: `CO`는 밝은 색, `AI`와 심볼은 브랜드색

---

## Part C. 접근성 (40~60대 사용자 기준)

### C1. 필수 기준 (WCAG 2.1 AA)
- 글자 대비: 본문 4.5:1 이상, 큰 글씨(18.66px 굵게 / 24px 이상) 3:1 이상 — **라이트, 다크 모두**
- 최소 글자 크기: 본문 16px, 메타 14px (docs/03)
- 터치 영역: 최소 44×44px (아이콘 버튼 포함)
- 키보드: 모든 기능을 Tab으로 이동하고 Enter/Space로 실행할 수 있어야 합니다. 포커스 표시는 2px `--color-focus` 외곽선
- 이미지: 의미 있는 이미지에는 `alt`, 장식 이미지는 `alt=""`
- 캐러셀: 일시정지 버튼, 키보드 좌우 이동, 자동 넘김 중 포커스가 들어가면 멈춤
- 모달: 열리면 포커스를 안으로 옮기고, Esc로 닫고, 닫히면 원래 버튼으로 포커스를 돌려줍니다.
- `prefers-reduced-motion`이면 자동 넘김과 큰 애니메이션을 끕니다.

### C2. 이 사이트만의 추가 배려
- **글자 크게 보기**: 헤더 또는 설정에 [가 / 가+ / 가++] (기본 100% / 112.5% / 125%). `html { font-size }`를 바꾸고 레이아웃은 `rem` 단위로 만들어 함께 커지게 합니다.
- 아이콘만 있는 버튼은 줄이고 **아이콘 + 글자**를 기본으로 씁니다 (예: 복사 아이콘 옆에 "복사").
- 오류 메시지는 무엇이 잘못됐고 어떻게 고치는지 쉬운 말로 씁니다. 예: ❌ "Invalid input" → ⭕ "이메일 주소에 @가 빠졌어요."
- 전문 용어에는 첫 등장 시 툴팁 설명을 붙입니다 (예: "프롬프트 = AI에게 하는 요청 문장").

### C3. 점검 도구
- 자동: axe DevTools / Lighthouse 접근성 90점 이상
- 수동: 키보드만으로 홈 → 프롬프트 복사 → 작품 실행 → 모달 닫기 완료
- 실제 사용자 테스트: 당근 모임 회원 3~5명에게 "프롬프트 하나 찾아서 복사하기", "작품 실행해 보기"를 부탁하고 막히는 지점을 기록합니다.
