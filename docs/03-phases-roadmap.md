# 03. Phases Roadmap — 상세 기능 정의

각 Phase는 "목표 / 핵심 기능 / 신규 DB 엔티티 / 등록 모듈 / 화면 노출 방식 / 체크리스트" 순으로 정의한다.
Claude Code는 특정 Phase 작업을 시작하기 전 이 문서에서 해당 섹션만 발췌해 컨텍스트로 사용한다.

---

## Phase 1 — 프롬프트 전시실 (Prompt Wiki)

**목표**: 트래픽·리텐션 확보, 프롬프트 협업 문화 형성

**핵심 기능**
- 프롬프트 등록 (텍스트, 카테고리, 사용 모델 태그)
- 결과물 첨부 (이미지/텍스트, 이 시점엔 외부에서 생성해 업로드하는 방식도 허용)
- 버전업(포크): 기존 프롬프트를 복사해 수정 → 원본과 관계 유지
- 커뮤니티 평가: 좋아요, 댓글, 베스트 프롬프트 랭킹
- 검색/필터 (카테고리, 모델, 인기순, 최신순)
- 프롬프트 위키 트리뷰 (포크 관계 시각화)

**신규 DB 엔티티**: `users`, `profiles`, `prompts`, `prompt_versions`, `artifacts`(type=`image`/`text`), `votes`, `comments`, `modules`, `events`

**등록 모듈**: `module: prompt-wiki`, `phase: 1`, `mainScreenSlot: hero`

**화면 노출**: 메인 화면 자체가 이 모듈. 로그인 없이 열람 가능, 등록/투표는 로그인 필요.

**체크리스트**
- [x] Supabase 프로젝트 생성, RLS 기본 정책
- [x] Google OAuth 로그인
- [x] 다크/라이트 토글, 다국어(ko/en) 기본 골격
- [x] `modules` 레지스트리 테이블 및 런타임 렌더링 로직 (Phase 2 이후를 위한 선행 작업)
- [x] 프롬프트 CRUD + 버전업(포크) 로직
- [x] 좋아요/댓글/랭킹
- [x] 어드민: 신고 처리, 콘텐츠 숨김 처리
- [x] 프롬프트 위키 트리뷰 (포크 관계 시각화)
- [x] Prisma→Supabase REST 마이그레이션 (API 성능 최적화)
- [x] Vercel 리전 도쿄 배치 (DB 인접 배치)

---

## Phase 2 — 멀티모델 비교 실험실

**목표**: 첫 유료화. 같은 프롬프트를 여러 이미지/영상 모델에 태워 비교

**핵심 기능**
- 프롬프트 위키에서 "이 프롬프트로 비교해보기" 진입
- 모델 선택 (이미지 2~4종, 영상 1~2종부터 시작 — 벤더는 `docs/04` 참조)
- 생성 결과 그리드 비교 뷰
- 크레딧 시스템: 원가 대비 약 40% 마진 과금
- 생성 결과를 다시 Phase 1 전시실에 게시 가능 (모듈 간 연결)

**신규 DB 엔티티**: `model_providers`, `generation_jobs`, `credits`, `credit_transactions`, `artifacts`(type=`image`/`video` 확장)

**등록 모듈**: `module: model-lab`, `phase: 2`, `mainScreenSlot: feed`, `status: 'new'` (출시 시 자동으로 메인 화면에 배너 노출)

**화면 노출**: Phase 1 완료 후 이 모듈만 활성화(`enabled: true`)하면 메인 화면에 "NEW" 배지와 함께 자동 등장. 별도 레이아웃 재설계 불필요.

**체크리스트**
- [x] 멀티모델 프록시 게이트웨이 (IImageAdapter 인터페이스 + 4개 벤더 어댑터: default/openai/stability/replicate)
- [x] 크레딧 결제(선불) 연동 — IPaymentProvider 어댑터 패턴 (demo + stripe)
- [x] 원가 계측 및 마진 로직 (ModelProvider.marginRate DB 컬럼, 관리자 모델별 조정 가능)
- [x] 생성 큐/재시도/실패 처리 (fire-and-forget async + 2초 폴링 + 환불)
- [x] 결과물 비교 UI (3단계 폼 + 그리드 비교 + 배치 게시 + 크레딧 잔액 표시)

---

## Phase 3 — 자동화 파이프라인 (3D / 숏폼 / 상세페이지)

**목표**: 체류시간·객단가 증가, 실사용 자동화 도구 제공

**핵심 기능**
- 3D 에셋 파이프라인: 이미지/텍스트 → 3D 모델 생성 → 뷰어에서 회전/미리보기
- 숏폼 영상 파이프라인: 스크립트/이미지 → 영상 합성 → 플랫폼 내 재생
- 상세페이지 파이프라인: 상품 정보 → 이커머스용 상세페이지 자동 조립
- 게임 파이프라인: 장르/테마/난이도 → HTML5 게임 생성 → iframe 실행
- 카피라이팅 파이프라인: 제품/타깃/톤 → 광고 카피 3안
- 각 파이프라인 산출물은 `artifacts` 테이블에 저장되어 Phase 1/4/5에서 재사용 가능

**신규 DB 엔티티**: `pipelines`, `pipeline_runs`, `artifacts`(type=`3d_asset`/`video`/`landing_page`/`game` 확장)

**등록 모듈**: `module: tool-3d`, `tool-shortform`, `tool-detailpage`, `tool-game` — 사이드바 "도구" 그룹으로 묶임

**화면 노출**: 파이프라인 목록 뷰 + 개별 실행 뷰. 실행 엔진 추상화 적용 (`docs/07` 기준).

**체크리스트**
- [x] 파이프라인 API (목록/실행/상태 폴링) + 크레딧 차감/환불
- [x] 5개 파이프라인 러너 (3D/숏폼/상세페이지/게임/카피라이팅) — LLM 스펙 생성 + AI 이미지 생성
- [x] 파이프라인 목록 UI + 개별 실행 UI (입력 폼/진행률/결과 미리보기/게시)
- [x] 3D 뷰어 (인터랙티브 드래그 회전 + 자동 회전)
- [x] 숏폼 플레이어 (크로스페이드 트랜지션 + 프로그레스바 + 재생/일시정지 + 자막)
- [x] 상세페이지 풀 렌더러 (Hero/Sections/FAQ/Footer 전체 렌더링)
- [x] 게임 iframe 샌드박스 실행 엔진
- [ ] 품질 게이트(애드센스 정책 위반 방지용 콘텐츠 심사 로직) — 선행 설계 필요
- [ ] 실제 3D 모델 생성 API 연동 (현재는 AI 이미지로 대체)
- [ ] 실제 영상 합성 API 연동 (현재는 이미지 슬라이드쇼로 대체)

---

## Phase 4 — 출시·검증 인프라 (진짜 차별화 지점)

**목표**: 결제모듈, 애드센스, 스모크테스트를 상품화 — 바이브코딩의 "마지막 허들"을 낮춤

**핵심 기능**
1. 결과물 업로드 → 커뮤니티 공개/평가 (Phase 1 인프라 재사용)
2. 플랫폼 결제모듈(Stripe Connect 등) 연동 → 개별 PG 가입 없이 결제 시작
3. 애드센스 연동 → 광고 수익 공유
4. **스모크테스트 서비스**: 플랫폼 광고 채널로 2~3주 광고 집행 → 인사이트 리포트(전환율, 반응, 개선점, 출시 성공 가능성 점수) 제공
5. 리포트 기반 유저 선택: 독자 출시 or 플랫폼 입점(수익공유)
6. 게임 등 마이크로 콘텐츠는 "모음집" 형태 입점 지원

**신규 DB 엔티티**: `payment_accounts`, `revenue_shares`, `ad_campaigns`, `smoke_tests`, `smoke_test_reports`, `marketplace_listings`

**등록 모듈**: `module: smoke-test`, `revenue-dashboard` — Phase 4 활성화 시 사이드바 노출

**체크리스트**
- [x] Stripe Checkout 세션 생성 (크레딧 패키지 4종, KRW 가격)
- [x] Stripe Webhook 엔드포인트 (/api/webhooks/stripe — checkout 완료 시 크레딧 추가)
- [x] Stripe Connect Express 온보딩 플로우 (계정 생성 + 온보딩 URL)
- [x] IPaymentProvider 어댑터 패턴 (PAYMENT_PROVIDER env로 demo↔stripe 전환)
- [x] 스모크테스트 신청 → 관리자 승인 → 실행 → 리포트 생성 전체 플로우
- [x] 스모크테스트 UI (리스트/상세/Recharts 차트/인사이트)
- [x] 수익 대시보드 (월별 트렌드 차트/정산 테이블/계정 연동)
- [x] 관리자 패널 (모듈 토글/콘텐츠 심사/스모크테스트 승인/브리프 승인/사용자 관리)
- [ ] 애드센스 실연동 (현재 광고 캠페인은 합성 데이터)
- [ ] 실제 광고 집행 API 연동 (Google Ads/Meta Ads 등)
- [ ] 법률 검토: 전자상거래법, 표시광고법, 개인정보 (광고 대행 관련)

---

## Phase 5 — 문제-개발자 매칭 마켓플레이스

**목표**: Phase 4 인프라(결제/광고/스모크테스트)를 재사용하는 새 입력 채널

**핵심 기능**
- 문제 정의자: 자연어로 문제 설명 → AI가 요구사항 스펙으로 구조화
- 심사 통과 시 개발자에게 공개 발주
- 개발자 매칭/입찰
- 개발 완료 → Phase 4 파이프라인(결제/광고/스모크테스트)으로 그대로 진입
- 수익공유 계약 자동 생성

**신규 DB 엔티티**: `problem_briefs`, `bids`, `matches`, `contracts`

**등록 모듈**: `module: marketplace`, `phase: 5`, `mainScreenSlot: sidebar`

**체크리스트**
- [x] AI 기반 요구사항 구조화 (LLM chatJson으로 자연어 → StructuredSpec 변환)
- [x] 브리프 CRUD + 제출/승인/거절 플로우
- [x] 관리자 브리프 심사 (approve/reject 엔드포인트)
- [x] 입찰 API (개발자가 approved 브리프에 입찰)
- [x] 매칭 API (브리프 작성자가 낙찰, 트랜잭션으로 원자적 처리)
- [x] 계약 자동 생성 (70/30 수익공유 조건 + 마일스톤)
- [x] 마켓플레이스 리스팅 (아티팩트 입점, 수익모델 선택)
- [x] 마켓플레이스 UI (리스팅 탭 + 브리프 탭 + 상세 다이얼로그 + 입찰/매칭 UX)
- [ ] Phase 4 파이프라인과의 이벤트 연결 (`problem_brief.matched` → `artifact.created`)

---

## MVP 우선순위 제안

리소스가 제한적일 때는 **Phase 1 + Phase 2**만으로 트래픽과 과금모델을 먼저 검증하고, Phase 4(스모크테스트)는 데이터·신뢰가 쌓인 뒤 착수하는 것을 권장한다 (`docs/01-vision-positioning.md` 리스크 섹션 참조).
