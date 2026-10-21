# 02. 정보 구조 (IA) · 라우트

## 1. 글로벌 내비게이션 (GNB)

PC 헤더에는 메뉴 8개를 모두 노출합니다. 순서는 아래와 같습니다.

| 순서 | 메뉴 | 라우트 | i18n 키 |
|---|---|---|---|
| 1 | 홈 | `/[locale]` | `nav.home` |
| 2 | 뉴스·이벤트 | `/[locale]/news` | `nav.news` |
| 3 | 프롬프트 | `/[locale]/prompts` | `nav.prompts` |
| 4 | 만들어보기 | `/[locale]/make` | `nav.make` |
| 5 | 바로쓰기 | `/[locale]/tools` | `nav.tools` |
| 6 | 가이드 | `/[locale]/guide` | `nav.guide` |
| 7 | 배우기 | `/[locale]/learn` | `nav.learn` |
| 8 | 커뮤니티 | `/[locale]/community` | `nav.community` |

- 시안에는 메뉴가 5개만 있지만, 메뉴 간격과 활성 표시(빨간 밑줄) 스타일은 시안 그대로 유지하고 개수만 8개로 늘립니다.
- PC 너비가 1280px 미만이면 메뉴 간격을 줄입니다. 1024px 미만이면 모바일 헤더로 바뀝니다.

## 2. 모바일 내비게이션

### 상단 가로 스크롤 탭
시안처럼 로고 아래에 가로 스크롤 탭을 둡니다. 8개 메뉴가 모두 들어가며, 활성 탭은 빨간 밑줄로 표시합니다.

### 하단 탭 바 (5개 고정)
| 아이콘 | 라벨 | 라우트 |
|---|---|---|
| home | 홈 | `/` |
| book-open | 배우기 | `/learn` |
| sparkles | 프롬프트 | `/prompts` |
| play-square | 만들어보기 | `/make` |
| users | 커뮤니티 | `/community` |

- 시안의 하단 탭(홈, 뉴스, 프롬프트, 배우기, 커뮤니티)과 **디자인은 같고 구성만 다릅니다.** 차별점인 만들어보기를 하단에 올리고, 뉴스는 홈과 상단 탭으로 접근합니다.
- 나머지 메뉴(뉴스·이벤트, 바로쓰기, 가이드)와 마이페이지, 설정(언어, 테마)은 햄버거 메뉴(☰)에 넣습니다.

## 3. 사이트맵

```
/[locale]
├── (홈)
├── news
│   ├── ?tab=news | events
│   ├── [newsId]
│   └── events/[eventId]
├── prompts
│   ├── ?category=image|video|work|writing|coding
│   ├── [promptId]
│   └── new
├── make
│   ├── ?type=motion|game|vibe|landing
│   ├── [projectId]          ← 상세 + 실행 모달
│   └── new
├── tools
│   ├── qr
│   ├── shorten
│   ├── tts
│   ├── stt
│   ├── image-convert
│   └── summarize
├── guide
│   ├── services             ← AI 서비스 사용설명서 (기존 aiguidepage 이전)
│   │   └── [serviceSlug]
│   ├── tips                 ← 스킬·팁·오픈소스
│   │   └── [tipId]
│   └── new                  (권한 필요)
├── learn
│   ├── courses/[courseId]
│   ├── watch/[videoId]      ← AI 학습 플레이어
│   ├── study                ← 스터디방
│   │   └── [studyId]/[sessionNo]
│   └── watch-party/[roomId] (3단계)
├── community
│   ├── ?board=free|qna|notice&tag=
│   ├── [postId]
│   └── new
├── search?q=
├── u/[nickname]             ← 공개 프로필
├── me                       ← 마이페이지 (내 글, 저장, 알림, 설정)
├── login
├── signup
└── admin                    ← 어드민 모드 (docs/07)
    ├── dashboard
    ├── content
    ├── review               ← 승인 대기열
    ├── reports
    ├── banners
    ├── users
    ├── tools
    └── settings
```

## 4. 콘텐츠 연결 규칙 (메뉴 간 흐름)

| 출발 | 도착 | 연결 방식 |
|---|---|---|
| 가이드 > 서비스 상세 | 프롬프트 | "이 서비스로 만든 프롬프트" 목록 (tool 필드 기준) |
| 가이드 > 팁 | 바로쓰기 | "바로 써보기" 버튼 |
| 배우기 > 스터디 회차 | 프롬프트 / 만들어보기 | 과제 제출 시 해당 갤러리에 게시 (`studySessionId` 연결) |
| 프롬프트 / 만들어보기 | 커뮤니티 | "후기 쓰기"는 커뮤니티 글로 작성, 원본 링크 첨부 |
| 뉴스·이벤트 > 행사 | 배우기 > 스터디 | 스터디 행사는 스터디방으로 연결 |

## 5. 작성 권한 요약 (상세: docs/07)

| 메뉴 | 작성 가능 | 공개 방식 |
|---|---|---|
| 뉴스 | 운영진, 에디터 | 즉시 |
| 이벤트 | 운영진, 에디터 | 즉시 |
| 프롬프트 | 회원 | 즉시 (신고 시 숨김) |
| 만들어보기 | 회원 | **운영진 승인 후 공개** |
| 가이드 > 서비스 | 운영진, 에디터 | 즉시 |
| 가이드 > 팁 | 운영진, 에디터, 우수회원 이상 | 우수회원은 승인 후 공개 |
| 배우기 | 운영진, 에디터 | 즉시 |
| 커뮤니티 | 회원 (공지는 운영진만) | 즉시 |

## 6. 통합 검색

- 대상: 뉴스, 이벤트, 프롬프트, 만들어보기, 가이드, 커뮤니티
- 결과는 탭별로 묶어서 보여줍니다 (전체 / 프롬프트 / 커뮤니티 …).
- 1단계 구현: Firestore 키워드 배열(`searchKeywords`) 기반 prefix 검색
- 확장 시: Algolia 또는 Typesense 연동 검토 (Firebase Extensions 제공 여부와 비용은 도입 시점에 확인)
