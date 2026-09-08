# 02. Architecture Core Principles — 모듈 레지스트리 패턴

## 왜 이 패턴이 필요한가

"메인 화면은 Phase 1만 보이지만, Phase 2/3이 먼저 완성될 수도 있고, 완성되는 즉시 화면에 자연스럽게 노출돼야 한다"는 요구사항은 **하드코딩된 네비게이션으로는 절대 못 푼다.** 새 기능이 배포될 때마다 레이아웃 컴포넌트를 수정하면, 그 자체가 "재설계"가 되어버리기 때문.

해법은 워드프레스 플러그인 / Notion 블록 타입 추가와 같은 **모듈 레지스트리(Module Registry)** 구조.

---

## 1. 모듈 등록 계약 (Module Contract)

모든 기능(Phase 1의 프롬프트 위키부터 Phase 5의 마켓플레이스까지)은 아래 형태의 설정을 선언한다.

```ts
// /modules/<module-id>/module.config.ts
export interface ModuleConfig {
  id: string;                    // 'prompt-wiki', 'model-lab', 'pipeline-3d' 등
  phase: 1 | 2 | 3 | 4 | 5;
  title: Record<Locale, string>; // i18n
  icon: string;                  // 아이콘 키
  navOrder: number;              // 노출 순서 (낮을수록 먼저)
  enabled: boolean;               // 어드민에서 on/off
  status: 'active' | 'new' | 'beta' | 'coming-soon';
  newUntil?: string;             // ISO date — 이 날짜까지 "NEW" 배지 표시
  mainScreenSlot?: 'hero' | 'feed' | 'sidebar' | 'none'; // 전시실 내 배치 위치
  requiresAuth: boolean;
  entryRoute: string;            // '/lab', '/pipelines/3d' 등
}
```

- 신규 모듈 추가 = 이 설정 파일 하나 추가 + `modules/registry.ts`에 import 등록
- 네비게이션, 메인 피드, 알림 배너는 전부 이 레지스트리를 **런타임에 조회**해서 렌더링 (하드코딩 금지)
- `enabled: false`로 두면 코드는 배포돼 있어도 화면엔 안 보임 → **다크 런치(dark launch)** 가능. 어드민이 준비되면 토글로 노출.

## 2. 메인 화면(전시실) 렌더링 로직

```
mainScreen = modules
  .filter(m => m.enabled && m.mainScreenSlot !== 'none')
  .sort((a, b) => a.navOrder - b.navOrder)
  .map(renderSlot)
```

- Phase 2가 Phase 3보다 늦게 완성돼도, `navOrder`와 `phase` 값만 정해주면 자동으로 올바른 위치에 꽂힌다.
- `status: 'new'`인 모듈은 메인 화면 상단에 배지/배너로 강조 (상세는 `docs/06-ui-layout-system.md`).

## 3. 실행 엔진 추상화 계약

사용자 결과물(게임/3D/영상/솔루션)을 플랫폼 내부에서 보여주는 방식은 Phase마다 다른 기술을 쓰지만, 호출부는 아래 인터페이스만 안다.

```ts
export interface IExecutionEngine {
  id: 'iframe-sandbox' | 'webcontainer' | 'microvm';
  supports(artifactType: ArtifactType): boolean;
  run(artifact: Artifact, opts: RunOptions): Promise<ExecutionHandle>;
  terminate(handle: ExecutionHandle): Promise<void>;
}
```

- 엔진 선택 로직(`ExecutionEngineRouter`)이 `artifact.type`과 `artifact.requiredTier`를 보고 적절한 구현체를 고른다.
- 상세 스펙: `docs/07-sandbox-execution-engine.md`

## 4. 이벤트 기반 확장 포인트

Phase가 늘어날수록 "결과물 업로드 → 평가 → 결제 → 스모크테스트"처럼 여러 모듈이 하나의 아티팩트에 순차적으로 개입한다. 이를 강결합 대신 이벤트로 연결한다.

```
artifact.created
artifact.published
artifact.payment_module_attached
artifact.smoke_test_requested
artifact.smoke_test_completed
artifact.marketplace_listed
```

각 모듈은 자신이 관심있는 이벤트만 구독한다. 예: 결제 모듈은 `artifact.published`를 구독해 "결제 붙이기" CTA를 노출.

## 5. DB 설계와의 연결

이 아키텍처가 성립하려면 DB도 Phase별로 흩어져 있으면 안 된다. `artifacts`, `modules`, `events` 같은 공통 테이블이 Phase 1부터 존재해야 한다. 상세는 `docs/05-database-schema.md`.

## 6. 안티패턴 (하지 말 것)

- ❌ `if (phase === 2) { ... }` 같은 조건문을 레이아웃 컴포넌트에 직접 작성
- ❌ 새 파이프라인 추가할 때마다 메인 페이지 JSX를 수정
- ❌ 실행 방식이 바뀔 때 기존 아티팩트 데이터 마이그레이션이 필요한 구조
- ❌ 모듈 간 직접 함수 호출 (반드시 이벤트나 정의된 인터페이스로만 통신)
