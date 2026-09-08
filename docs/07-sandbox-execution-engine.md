# 07. Sandbox Execution Engine — 유저 결과물 실행 아키텍처

## 문제 정의

유저가 만든 게임/솔루션/3D/영상을 플랫폼 안에서 "바로 실행"되게 하는 문제는 사실 난이도가 전혀 다른 3가지 케이스가 섞여 있다.

| 유형 | 예시 | 실행에 필요한 것 |
|---|---|---|
| 정적 웹 콘텐츠 | HTML5/JS 게임, 상세페이지 | 브라우저 격리만 |
| 클라이언트 프레임워크 앱 | React/Vue 앱 | 빌드 산출물화 후 정적 콘텐츠와 동일 처리 |
| 서버 로직 포함 솔루션 | DB 연동, 외부 API 호출 | 실제 실행 환경(런타임) 격리 필요 |

**핵심 통찰**: 바이브코딩 결과물의 대다수(특히 Phase 3의 마이크로게임)는 1번 케이스다. 처음부터 범용 풀스택 샌드박스를 만들 필요 없다. **1번만으로 초기 80%를 커버**하고, 필요할 때 tier를 올린다.

---

## `IExecutionEngine` 인터페이스 (재게재, `docs/02` 참조)

```ts
export interface IExecutionEngine {
  id: 'iframe-sandbox' | 'webcontainer' | 'microvm';
  supports(artifactType: ArtifactType): boolean;
  run(artifact: Artifact, opts: RunOptions): Promise<ExecutionHandle>;
  terminate(handle: ExecutionHandle): Promise<void>;
}
```

라우팅 로직(`ExecutionEngineRouter`)은 `artifact.type`, `artifact.metadata.requiresServer` 같은 값을 보고 tier를 자동 선택한다. UI는 어떤 엔진이 뒤에서 돌아가는지 몰라도 된다.

---

## Tier 1 — iframe sandbox + CSP (Phase 1~2에서 바로 시작)

- `<iframe sandbox="allow-scripts allow-same-origin" ...>` 로 정적 HTML/JS/CSS 실행
- Content-Security-Policy로 외부 네트워크 호출 범위 제한
- 무한루프/과도한 리소스 사용 방지: `iframe` 자체 타임아웃 + Web Worker 격리 고려
- itch.io, CodePen 등이 쓰는 검증된 방식 — 기술 리스크 가장 낮음
- **제약**: 서버 로직, DB 연동, 민감한 API 키가 필요한 앱은 커버 불가

**보안 정책**
- `allow-same-origin`은 신중히: 격리 도메인(서브도메인 sandbox.<domain>.com)에서 서비스해 쿠키/세션 탈취 리스크 차단
- 업로드 시 정적 분석(악성 스크립트 패턴 스캔) 1차 필터링

## Tier 2 — WebContainer / Sandpack류 (Phase 3에서 검토)

- 브라우저 내에서 실제 Node.js 런타임을 구동하는 기술(StackBlitz WebContainers 계열, CodeSandbox Sandpack 등)
- 빌드 단계가 있는 React/Vue 앱, 간단한 Node 서버 로직까지 소화 가능
- 자체 개발보다 **상용/오픈소스 라이선싱이 현실적** (2026-09 시점 정확한 라이선스 조건은 재확인 필요)
- 비용: 브라우저 리소스를 쓰므로 서버 비용은 낮지만, 대형 앱은 성능 한계

## Tier 3 — microVM 격리 (Phase 4+, 진짜 서버 로직 필요할 때만)

- Firecracker 기반 마이크로 VM (예: E2B.dev류 AI 샌드박스 서비스) 또는 Vercel이 자체 제공하는 서버리스 격리 실행 환경
- Docker/Codespaces급 격리, DB 연동·실제 백엔드 실행 가능
- 비용·보안 부담 가장 큼 — Phase 4의 "스모크테스트용 실제 배포 미리보기" 등 꼭 필요한 곳에만 적용
- ⚠️ 2026-09 시점 Vercel/E2B 등의 정확한 제공 범위·가격은 학습 데이터 컷오프 이후 변경 가능성이 크므로, 착수 직전 공식 문서로 재검증 필수

---

## Phase별 도입 시점 요약

| Phase | 필요 Tier | 이유 |
|---|---|---|
| 1 | 없음 (이미지/텍스트 위주) | 실행 불필요 |
| 2 | 없음 | 생성 결과가 이미지/영상 파일 |
| 3 | Tier 1 (게임/상세페이지), Tier 2 검토 (빌드 필요한 파이프라인 산출물) | 3D 뷰어도 Tier 1으로 충분 (정적 GLB 파일 + Three.js 뷰어) |
| 4 | Tier 1~2 기본, 스모크테스트 미리보기용으로 Tier 3 선택적 도입 | 실제 배포 전 라이브 데모 필요 시 |
| 5 | 매칭된 개발자가 만든 결과물 유형에 따라 가변 | Router가 자동 판단 |

## 설계 원칙 재확인

- 실행 엔진을 하드코딩하지 말고 **artifact 메타데이터 기반 자동 라우팅**으로
- Tier가 올라가도 기존 아티팩트 데이터(스키마)는 마이그레이션 불필요해야 함 — `execution_tier` 필드만 갱신
- 보안 심사(정적 분석, 사용자 신고, 어드민 수동 검토)는 Tier와 무관하게 모든 업로드에 공통 적용
