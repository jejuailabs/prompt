# 04. Tech Stack (2026-09 기준)

⚠️ **중요 전제**: 이 문서는 2026년 9월 기준으로 작성됐으나, 특정 서비스의 최신 요금제·API 스펙·정책은 실시간으로 바뀔 수 있다. **실제 연동 코드를 작성하기 전 반드시 각 서비스의 공식 문서를 재확인**한다. 이 문서는 "방향성과 아키텍처 결정"을 위한 것이지, 정확한 API 레퍼런스가 아니다.

---

## 프론트엔드 / 배포

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js (App Router) | Vercel과 궁합, RSC로 초기 로딩 최적화, 모듈 레지스트리를 서버 컴포넌트로 조회 가능 |
| 배포 | Vercel | PR마다 Preview 배포 → Phase별 기능을 격리된 URL로 QA 가능 |
| 스타일 | Tailwind CSS + shadcn/ui 계열 | 다크/라이트 테마 토큰화 용이 |
| 상태관리 | React Server Components 우선, 필요시 Zustand | 과설계 지양 |

**검증 체크리스트 (배포 전)**
- [ ] Vercel 프로젝트의 Edge/Node 런타임 중 어떤 걸 쓸지 라우트별로 확인 (실행 엔진 관련 라우트는 Node 런타임 필요할 수 있음)
- [ ] Vercel 환경변수와 Supabase 환경변수 분리(Preview/Production)

---

## 백엔드 / 데이터

| 항목 | 선택 | 이유 |
|---|---|---|
| DB | Supabase Postgres | RLS로 세밀한 권한 통제, Phase 5까지 관계형 스키마로 충분히 커버 가능 |
| Auth | Supabase Auth (Google OAuth Provider) | 소셜 로그인 표준 플로우, 이후 이메일/기타 Provider 확장 용이 |
| Storage | Supabase Storage | 프롬프트 결과 이미지/영상/3D 파일 저장 |
| 서버리스 함수 | Supabase Edge Functions 또는 Vercel Functions | 웹훅(생성 완료, 결제 완료 등) 처리 |
| 실시간 | Supabase Realtime | 생성 작업 진행상황, 댓글 실시간 반영 |

**검증 체크리스트**
- [ ] Supabase RLS 정책을 `docs/05-database-schema.md`의 테이블별로 실제 작성 (문서에는 설계 의도만 기술)
- [ ] Google OAuth 클라이언트 ID/Secret 발급 및 Redirect URI를 Vercel 도메인 기준으로 등록
- [ ] Storage 버킷별 public/private 정책 분리 (사용자 업로드 원본 vs 공개 게시물)

---

## AI 모델 연동

| Phase | 용도 | 방식 |
|---|---|---|
| 1 | 없음 (외부 생성물 업로드 위주) | - |
| 2 | 이미지/영상 멀티모델 비교 | 벤더별 어댑터 뒤에 통합 게이트웨이 (Anthropic Claude API 포함, 이미지/영상은 별도 벤더 다수 필요) |
| 3 | 3D/영상/텍스트 파이프라인 | 파이프라인별 특화 API (3D 생성, TTS, 영상 합성 등) |
| 5 | 요구사항 구조화 | Claude API 프롬프트 체인 |

- 모든 벤더 연동은 `IModelProvider` 어댑터 인터페이스 뒤에 격리 (원가/레이트리밋/응답포맷이 벤더마다 다르므로)
- 원가 계측은 반드시 응답의 토큰/크레딧 사용량을 로깅해 마진 계산에 사용

**검증 체크리스트**
- [ ] 각 벤더의 2026년 9월 시점 요금제, Rate Limit, 상업적 이용 약관 재확인
- [ ] 크레딧 마진(약 40%) 산정 시 실제 원가 변동에 대응하는 버퍼 설계

---

## 실행/샌드박스

`docs/07-sandbox-execution-engine.md`에 상세. 요약:
- Phase 1~2: iframe sandbox만으로 충분
- Phase 3: WebContainer/Sandpack류 도입 검토
- Phase 4+: microVM 기반 격리(E2B, Vercel Sandbox 등) 검토 — **2026-09 시점 실제 제공 여부/가격은 재확인 필수**

---

## 결제 / 수익화

| 항목 | 선택 | 비고 |
|---|---|---|
| 글로벌 결제/정산 | Stripe Connect | 수익 분배(revenue share) 표준 기능 활용 |
| 국내(KR) 결제 | 국내 PG(토스페이먼츠, 아임포트 등) 검토 | Stripe의 국내 카드/간편결제 커버리지 재확인 필요 |
| 광고 수익 | Google AdSense | Phase 4 콘텐츠 품질 게이트와 반드시 연동 (정책 위반 리스크) |

**검증 체크리스트**
- [ ] Stripe Connect의 플랫폼 수수료/정산 주기 최신 정책 확인
- [ ] AdSense 정책(대량 자동생성 콘텐츠 관련) 최신 가이드라인 확인
- [ ] 국내 결제 규제(전자금융거래법 등) 검토

---

## 다국어 / 테마 / 관리자

`docs/08-i18n-auth-admin-theme.md`에 상세.

---

## 인프라 다이어그램 (텍스트)

```
[Browser]
   │
   ▼
[Next.js on Vercel] ── Preview per PR
   │            │
   │            └──▶ [Vercel Edge Functions] (webhook 수신 등)
   ▼
[Supabase]
   ├─ Postgres (핵심 데이터, RLS)
   ├─ Auth (Google OAuth)
   ├─ Storage (아티팩트 파일)
   ├─ Realtime (진행상황 스트리밍)
   └─ Edge Functions (비동기 작업)
   │
   ▼
[외부 AI 벤더 게이트웨이] ── 어댑터별 격리
[Stripe Connect] ── 결제/정산
[AdSense] ── 광고 수익
[실행 엔진: iframe → WebContainer → microVM] ── Phase별 교체
```
