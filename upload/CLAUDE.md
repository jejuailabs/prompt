# CLAUDE.md — 프로젝트 코어 컨텍스트

> 이 파일은 Claude Code가 이 저장소에서 작업할 때 **항상 먼저 읽어야 하는 최상위 지침서**입니다.
> 세부 스펙은 `docs/` 하위 문서를 참조하되, 아래 원칙과 충돌하는 코드는 작성하지 않습니다.

---

## 1. 프로젝트 한 줄 정의

**아이디어 구상 → 프롬프트 실험 → AI 파이프라인 제작 → 결과물 공유/평가 → 결제 연동 → 광고 스모크테스트까지, 바이브코딩의 전 과정에서 발생하는 마찰을 단계적으로 낮춰주는 AI 네이티브 올인원 플랫폼.**

세부 배경과 5단계 로드맵은 `docs/01-vision-positioning.md`, `docs/03-phases-roadmap.md` 참조.

---

## 2. 절대 원칙 (Non-negotiable)

### 원칙 A — 노출은 1단계씩, 설계는 5단계 전체를 위해
지금 사용자에게 보이는 화면은 **Phase 1(프롬프트 전시실)** 뿐이어야 하지만, 코드 아키텍처는 **처음부터 Phase 5까지 흡수 가능한 구조**로 짠다.
- 신규 기능(파이프라인, 마켓플레이스 등)은 "새 코드를 얹는 것"이 아니라 **"모듈을 레지스트리에 등록하는 것"**으로 구현한다.
- 모듈이 등록되면 네비게이션/메인 피드/알림에 **자동으로** 노출되어야 한다. 화면 배치를 손으로 다시 짜지 않는다.
- 상세 계약(interface)은 `docs/02-architecture-core-principles.md` 참조.

### 원칙 B — 실행 엔진은 추상 계층 뒤에 숨긴다
사용자가 만든 결과물(게임/3D/영상/솔루션)을 플랫폼 내부에서 실행하는 방식은 Phase가 올라갈수록 iframe sandbox → WebContainer → microVM으로 바뀐다. UI/호출부는 `IExecutionEngine` 인터페이스만 알고, 실제 구현체는 Phase에 따라 교체 가능해야 한다.
- 상세: `docs/07-sandbox-execution-engine.md`

### 원칙 C — DB 스키마는 처음부터 5단계를 감안한 범용 구조로
`prompts`, `artifacts`, `pipelines`, `executions`, `payments`, `revenue_shares` 같은 핵심 테이블은 Phase 1에서 다 안 쓰더라도 **처음부터 존재**해야 한다. 나중에 스키마 마이그레이션으로 급하게 붙이지 않는다.
- 상세: `docs/05-database-schema.md`

### 원칙 D — Phase 순서는 강제하지 않는다
Phase 2(모델 비교)와 Phase 3(파이프라인)는 시장 반응에 따라 순서가 바뀔 수 있다. 어떤 Phase가 먼저 나와도 원칙 A의 모듈 레지스트리 구조 덕분에 화면에 자연스럽게 얹혀야 한다.

---

## 3. 기술 스택 요약 (상세는 `docs/04-tech-stack-2026-09.md`)

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js (App Router) | Vercel 배포 전제 |
| 배포 | Vercel | Preview 배포로 Phase별 QA |
| DB/Auth/Storage | Supabase (Postgres, Auth, Storage, Edge Functions, Realtime) | RLS로 권한 통제 |
| 로그인 | Supabase Auth + Google OAuth | 이메일 로그인은 Phase 2 이후 고려 |
| 다국어 | next-intl | ko 기본, en 우선 추가 |
| 테마 | next-themes (dark/light 토글) | 시스템 설정 감지 + 수동 토글 |
| 결제 | Stripe Connect (수익 분배) + 국내 PG 검토 | Phase 4에서 본격 도입 |
| AI 실행 | Anthropic Claude API 기본, 멀티모델 프록시 레이어 | Phase 2에서 게이트웨이화 |
| 샌드박스 | iframe sandbox → WebContainer/Sandpack → microVM(E2B/Vercel Sandbox 등) | Phase별 단계적 도입 |
| 관리자 | `/admin` 라우트 그룹 + RBAC | Phase 플래그 on/off 여기서 관리 |

⚠️ 2026년 9월 시점 최신 정책/가격/API 스펙은 학습 데이터 컷오프 이후 변경됐을 수 있으므로, 실제 연동 전 각 서비스 공식 문서를 반드시 재확인한다 (`docs/04-tech-stack-2026-09.md` 하단 체크리스트 참조).

---

## 4. 현재 개발 상태

- **Active Phase: Phase 1 — 프롬프트 전시실 (Prompt Wiki)**
- 다음 착수 후보: Phase 2(멀티모델 비교) 또는 Phase 3(파이프라인) — 시장 신호에 따라 결정
- Phase별 상세 To-Do는 `docs/03-phases-roadmap.md`의 체크리스트 사용

---

## 5. 코딩 컨벤션 (Claude Code 작업 시 준수)

- 모든 신규 기능 모듈은 `/modules/<module-id>/` 하위에 격리하고, `module.config.ts`에 메타데이터(이름, 아이콘, 노출 조건, 노출 순서, 등장 Phase, "NEW" 배지 기간)를 선언한다.
- 화면 레이아웃은 하드코딩된 메뉴 배열을 쓰지 않고 `modules` 레지스트리를 조회해서 렌더링한다.
- DB 마이그레이션은 `docs/05-database-schema.md`의 스키마를 기준으로 하되, 실제 배포 전 Supabase 마이그레이션 파일로 버전 관리한다.
- 커밋 단위는 Phase/모듈 단위로 쪼갠다. 하나의 PR이 여러 Phase를 걸치지 않는다.
- 새 외부 서비스(결제, 광고, 실행엔진)를 붙일 때는 반드시 어댑터 패턴을 사용해 코어 로직과 분리한다.

---

## 6. 문서 맵

| 문서 | 내용 |
|---|---|
| `docs/01-vision-positioning.md` | 포지셔닝, 타겟, Phase별 노스스타 지표 |
| `docs/02-architecture-core-principles.md` | 모듈 레지스트리 패턴, 인터페이스 계약 |
| `docs/03-phases-roadmap.md` | Phase 1~5 상세 기능/DB/UI 정의 및 체크리스트 |
| `docs/04-tech-stack-2026-09.md` | 기술 스택 상세 및 2026-09 기준 검증 체크리스트 |
| `docs/05-database-schema.md` | 전체 Phase를 위한 Supabase 스키마 |
| `docs/06-ui-layout-system.md` | 메인 화면(전시실) 동적 레이아웃, 다크/라이트 |
| `docs/07-sandbox-execution-engine.md` | 실행 엔진 추상화, 3단계 기술 옵션 |
| `docs/08-i18n-auth-admin-theme.md` | 다국어, 로그인, 관리자 모드, 테마 구현 스펙 |
| `docs/09-design-system.md` | PLAYLAB UI 정의 — 화면별 레이아웃, 모듈 매핑, 공통 컴포넌트 인벤토리 |

---

## 7. Claude Code 작업 시작 체크리스트

새 세션에서 이 프로젝트 작업을 시작할 때:
1. 이 파일과 `docs/03-phases-roadmap.md`를 먼저 읽고 현재 Active Phase 확인
2. 요청받은 기능이 어느 Phase에 속하는지 확인, 해당 Phase의 DB/모듈 정의 확인
3. 신규 모듈이면 `docs/02-architecture-core-principles.md`의 인터페이스 계약을 따라 등록
4. 실행/렌더링이 필요한 기능이면 `docs/07-sandbox-execution-engine.md` 기준 적정 tier 선택
5. 완료 후 `docs/03-phases-roadmap.md` 체크리스트 업데이트
