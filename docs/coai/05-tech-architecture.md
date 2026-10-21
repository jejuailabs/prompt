# 05. 기술 아키텍처 (Vercel + Firebase)

## 1. 전체 구조

```
┌──────────────────────────── 사용자 브라우저 ────────────────────────────┐
│  coai.(도메인)  — Next.js 앱 (Vercel)                                    │
│     │  Firebase JS SDK: Auth(로그인), Firestore 읽기·쓰기(보안 규칙 적용) │
│     │                                                                   │
│     ├── Route Handlers (/api/*) — Vercel Functions                      │
│     │      Firebase Admin SDK: 권한 확인, 집계, 업로드 처리, AI API 호출 │
│     │                                                                   │
│     └── <iframe sandbox> ──► play.(별도 도메인) — 샌드박스 실행 (docs/08)│
└─────────────────────────────────────────────────────────────────────────┘
          │                         │                        │
   Firebase Auth             Cloud Firestore          Cloud Storage
   (구글, 이메일)            (콘텐츠, 회원, 설정)      (이미지, 영상, ZIP)
```

- **Vercel**: Next.js 렌더링(SSR / ISR / 정적), API 라우트, 프리뷰 배포
- **Firebase**: 인증, 데이터베이스, 파일 저장. 서버 기능은 Cloud Functions 대신 **Vercel Route Handlers + Admin SDK**로 통일합니다. 예외: Firestore 트리거가 꼭 필요한 집계(댓글 수 등)는 Cloud Functions를 쓸 수 있습니다. 이 경우 Blaze(종량제) 요금제가 필요할 수 있으니 도입 전에 확인합니다.
- **샌드박스 도메인**: 본 사이트와 다른 등록 도메인(eTLD+1)을 씁니다. 예: 본 사이트 `coai.kr`, 샌드박스 `coai-play.app` (이름은 미정, Q1)

## 2. 렌더링 전략

| 페이지 | 방식 | 이유 |
|---|---|---|
| 홈, 목록 | ISR (60초) | 검색 노출 + 빠른 로딩 |
| 상세(뉴스, 가이드, 프롬프트, 작품) | ISR (300초) + 수정 시 on-demand revalidate | 검색 노출 |
| 커뮤니티 목록·상세 | SSR 또는 ISR (30초) | 최신성 |
| 마이페이지, 어드민, 글쓰기 | 클라이언트 렌더링 (로그인 필요) | 개인화 |
| 바로쓰기 도구 | 정적 페이지 + 클라이언트 동작 / API | |

서버 컴포넌트에서 Firestore를 읽을 때는 Admin SDK를 쓰고, 공개 데이터만 반환합니다.

## 3. 폴더 구조

```
coai/
├── ORCHESTRATION.md
├── docs/
├── design/reference/            # 시안 이미지
├── messages/                    # 다국어 문자열 (docs/10)
│   ├── ko.json
│   └── en.json
├── public/
│   ├── brand/                   # COAI 로고 SVG, 파비콘
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx       # ThemeProvider, NextIntlClientProvider, Header, BottomTab
│   │   │   ├── page.tsx         # 홈
│   │   │   ├── news/ prompts/ make/ tools/ guide/ learn/ community/
│   │   │   ├── search/ me/ u/[nickname]/ login/ signup/
│   │   │   └── admin/           # 어드민 모드 (layout에서 역할 확인)
│   │   └── api/
│   │       ├── auth/session/    # 세션 쿠키 발급·삭제
│   │       ├── upload/          # 업로드 서명 URL, ZIP 검사
│   │       ├── tools/[tool]/    # 바로쓰기 서버 처리 (요약, TTS …)
│   │       ├── revalidate/      # on-demand ISR
│   │       └── admin/*          # 어드민 전용 API
│   ├── components/
│   │   ├── ui/                  # Button, Badge, Modal … (docs/03)
│   │   ├── layout/              # Header, Footer, BottomTab, MobileDrawer
│   │   ├── home/                # HeroCarousel, SectionPanel …
│   │   └── features/            # prompts/, make/, community/ …
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts        # 브라우저용 SDK 초기화
│   │   │   ├── admin.ts         # 서버용 Admin SDK (server-only)
│   │   │   └── converters.ts    # Firestore 타입 변환
│   │   ├── auth/                # getCurrentUser(), requireRole()
│   │   ├── i18n/                # next-intl 설정, routing
│   │   ├── rate-limit.ts
│   │   └── utils.ts
│   ├── types/                   # 컬렉션 타입 (docs/06과 일치)
│   ├── styles/
│   │   ├── tokens.css           # 디자인 토큰 (docs/03)
│   │   └── globals.css
│   └── middleware.ts            # 로케일 라우팅 + /admin 1차 보호
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
└── .env.example
```

## 4. 환경변수

```bash
# 공개 (브라우저에 노출됨 — 비밀값을 넣지 말 것)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_SITE_URL=https://coai.example
NEXT_PUBLIC_SANDBOX_ORIGIN=https://play.coai-sandbox.example

# 서버 전용 (Vercel 환경변수에만 저장)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=          # 줄바꿈은 \n 으로 저장 후 코드에서 복원
SESSION_COOKIE_SECRET=
REVALIDATE_SECRET=
AI_API_KEY=                          # 요약·STT 등에 쓰는 AI API 키 (docs/09)
TTS_API_KEY=
RATE_LIMIT_REDIS_URL=                # Upstash 등 (선택)
```

- Firebase 웹 API 키는 공개돼도 되는 값이지만, **보안은 Firestore/Storage 규칙과 API 라우트에서 지킵니다.**
- `.env.local`은 git에 올리지 않습니다. `.env.example`만 커밋합니다.

## 5. 인증 흐름

1. 브라우저에서 Firebase Auth로 로그인 (구글 / 이메일·비밀번호)
2. ID 토큰을 `/api/auth/session`으로 보내 **httpOnly 세션 쿠키** 발급 (Admin SDK `createSessionCookie`)
3. 서버 컴포넌트와 API 라우트는 쿠키를 검증해 사용자와 역할(custom claims)을 확인
4. 로그아웃하면 쿠키를 삭제하고 세션을 폐기(`revokeRefreshTokens`)

## 6. 배포

| 환경 | 브랜치 | Firebase 프로젝트 |
|---|---|---|
| Production | `main` | `coai-prod` |
| Preview | PR 브랜치 | `coai-dev` |
| Local | — | `coai-dev` 또는 Firebase Emulator |

- 보안 규칙과 인덱스는 Firebase CLI로 배포합니다: `firebase deploy --only firestore:rules,firestore:indexes,storage`
- 규칙 변경은 PR에서 Emulator 테스트를 통과해야 병합할 수 있습니다.

## 7. 비용 · 성능 주의사항

- Firestore는 **읽기 횟수로 과금**됩니다. 목록은 페이지당 20개로 제한하고, 댓글 수·좋아요 수는 문서 필드에 미리 집계해 둡니다(매번 count 쿼리를 하지 않음).
- 홈은 ISR로 캐시해서 방문자 수만큼 Firestore를 읽지 않게 합니다.
- 이미지는 업로드할 때 리사이즈(최대 1600px, WebP)하고 썸네일을 따로 만듭니다.
- 영상은 50MB로 제한합니다. 긴 영상은 유튜브 링크로 받습니다.
- 정확한 요금(Vercel, Firebase 무료 한도)은 계획을 세울 때 각 공식 요금 페이지에서 다시 확인합니다. 이 문서에는 금액을 적지 않습니다.

## 8. 관측 · 운영
- 에러 추적: Sentry 또는 Vercel 기본 로그
- 분석: Vercel Analytics 또는 GA4 (개인정보 처리방침에 반드시 명시)
- 백업: Firestore 정기 내보내기 (Blaze 요금제 필요 여부 확인)
