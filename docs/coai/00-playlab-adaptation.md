# 00. COAI 문서를 이 저장소에 적용하는 규칙

> `docs/coai/` 문서는 원래 새 저장소(Firebase 기반)를 전제로 쓰였습니다.
> 이 저장소는 기존 PLAYLAB 코드를 **COAI로 전환**하므로, 아래 차이를 우선 적용합니다.
> 이 파일과 COAI 문서가 충돌하면 **이 파일이 우선**합니다. (2026-10-21 사용자 결정)

## 1. 확정 사항

| 항목 | 결정 |
|---|---|
| 브랜드 | PLAYLAB → **COAI**로 완전 교체. CO = Collaboration · Color · Communication, AI = 인공지능 |
| 저장소 | 이 저장소(`prompt`)에서 전환. 새 저장소를 만들지 않음 |
| 백엔드 | **Supabase 유지** (Postgres + RLS, Auth, Storage). Firebase는 쓰지 않음 |
| 로드맵 | COAI 단계(1~3단계)를 먼저 구현. 스모크테스트·애드센스·결제 수익 분배 등 기존 PLAYLAB Phase 기능은 이후 **모듈 레지스트리에 하나씩 등록**해 붙임 |
| 샌드박스 | 목표는 "업로드 코드에 심어진 악성 코드를 걸러내고, 못 걸러도 피해가 없게" 하는 것. 다층 방어(검사 → 승인 → 격리 실행 → 신고·차단 → 별도 도메인) |
| 디자인 | `design/reference/home-desktop-mobile.png` 시안을 그대로 재현. 필요한 일러스트는 `gpt-image-2.5-flare`(quality medium)로 생성 |

## 2. Firebase 용어 → 이 저장소 대응

| COAI 문서 | 이 저장소 |
|---|---|
| Firebase Auth (구글, 이메일) | Supabase Auth + Google OAuth (`src/lib/auth.ts`) |
| Firestore 컬렉션 | Prisma 모델 + Supabase Postgres (`prisma/schema.prisma`) |
| Firestore Security Rules | Supabase RLS + 서버 Route Handler 권한 확인 |
| Custom claims (역할) | `User.role` + 서버 `requireUser()`/관리자 확인 |
| Cloud Storage | Supabase Storage (`src/lib/server/storage.ts` 등) |
| Firebase Admin SDK | Prisma `db` + `supaAdmin` (server-only) |
| Cloud Functions 트리거 | Route Handler 또는 Postgres 트리거 |
| `src/lib/firebase/*` | 만들지 않음 |

COAI 데이터 모델(`06-data-model.md`)의 컬렉션은 Prisma 모델로 옮깁니다. 이미 있는 테이블(`prompts`, `artifacts`, 회원, 크레딧 등)은 재사용하고, 없는 것(뉴스, 배너, 가이드 서비스, 게시판 말머리 등)만 추가합니다.

## 3. 기존 PLAYLAB 기능 → COAI 메뉴

| COAI 메뉴 | 기존 기능 |
|---|---|
| 홈 | 새 홈(시안 레이아웃) |
| 뉴스·이벤트 | AI 일정(`ai-events`) + 신규 뉴스 게시판 |
| 프롬프트 | prompt-wiki |
| 만들어보기 | 게임, 랜딩페이지, 모션, creations |
| 바로쓰기 | AI Tools (TTS, QR, 변환 등) |
| 가이드 | 신규 (외부 AI 서비스 소개) |
| 배우기 | 강의(academy) |
| 커뮤니티 | 둘러보기·커뮤니티(gallery) + 게시판형 목록 |

크레딧 → 마이페이지, 워커·파이프라인 관리 → `/admin`. 기존 URL(`/app#...`)은 리다이렉트로 보존합니다.

## 4. 진행 단계

| 단계 | 내용 |
|---|---|
| S0 | 문서 정리 (이 파일, CLAUDE.md) |
| S1 | 로고 시안 → 디자인 토큰 → 헤더·모바일 탭 → 홈 |
| S2 | 8개 메뉴 매핑, 기존 URL 리다이렉트, 크레딧·어드민 위치 이동 |
| S3 | 뉴스 게시판, 가이드, 게시판형 커뮤니티, 배너 관리 |
| S4 | 만들어보기 보안 (검사·승인·격리·신고) |
| S5 | 기존 화면을 COAI 디자인 시스템에 맞춤 |
| 이후 | 스모크테스트, 애드센스, 결제 수익 분배 모듈 |

## 5. 생성 이미지 기록

모델 `gpt-image-2.5-flare`, quality `medium`, 1536×1024, 투명 배경. 비용은 응답 토큰 사용량 × 공식 단가(입력 텍스트 $5/1M, 출력 이미지 $30/1M)로 계산.

| 날짜 | 파일 | 용도 | 비용 |
|---|---|---|---|
| 2026-10-21 | `public/coai/posters/event.webp` | 홈 포스터 · 이벤트(책상·노트북) | $0.0110 |
| 2026-10-21 | `public/coai/posters/feature.webp` | 홈 포스터 · 특집(AI 책·전구) | $0.0111 |
| 2026-10-21 | `public/coai/posters/challenge.webp` | 홈 포스터 · 챌린지(달력) | $0.0110 |
| 2026-10-21 | `public/coai/posters/news.webp` | 홈 포스터 · 뉴스(AI 칩·앱 아이콘) | $0.0112 |
| 2026-10-21 | `public/coai/posters/study.webp` | 홈 포스터 · 스터디 모집(두 사람) | $0.0111 |
| 2026-10-21 | `public/coai/posters/photo/festa.webp` | 실사 포스터 샘플 · 인공지능 페스타(전시장) | $0.0110 |
| 2026-10-21 | `public/coai/posters/photo/claude.webp` | 실사 포스터 샘플 · 클로드 입문 수업(강의실) | $0.0111 |
| 2026-10-21 | `public/coai/posters/photo/vibe.webp` | 실사 포스터 샘플 · 바이브코딩 온라인 수업 | $0.0111 |
| 2026-10-21 | `public/coai/posters/photo/shop.webp` | 실사 포스터 샘플 · 소상공인 AI 교육(카페) | $0.0110 |
| 2026-10-21 | `public/coai/posters/photo/award.webp` | 실사 포스터 샘플 · AI 코리아 대상(시상식) | $0.0110 |
| | | **합계** | **$0.1106** |

실사 포스터는 1024×1536 불투명, 사진에 글자를 넣지 않고 제목·일시·장소는 HTML로 올립니다. 기본 표시는 실사, `/?posters=clay`로 3D 클레이 세트를 비교할 수 있습니다.

스타일 공통 프롬프트: "Soft 3D clay render illustration, cute rounded shapes, matte pastel materials, gentle studio lighting with soft shadows … Transparent background, no text". 어드민 배너 관리(S3)에 같은 템플릿을 넣습니다.
