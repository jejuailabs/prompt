# 12. 영상 스튜디오 프론트엔드 구조 프리브리핑

> 2026-09-13 작성 — Google Flow · Higgsfield Cinema Studio · MiniMax Design 분석 기반

---

## 1. 경쟁 플랫폼 핵심 기능 벤치마크

### 1-A. Google Flow (Storyboard Studio)

| 기능 | 설명 |
|---|---|
| **스토리→씬 자동 파싱** | 텍스트 입력 시 캐릭터·장소·소품을 자동 식별, 씬별 패널 생성 |
| **Ingredients** | 캐릭터·장소·소품을 재사용 에셋으로 관리, 여러 클립에서 재설명 없이 참조 |
| **Scenebuilder** | 타임라인 어셈블리, 패널을 드래그해서 시퀀스 조립 |
| **Camera Controls** | 숏별 카메라 앵글 수동 조정 가능 |
| **Flow Agent** | 자연어로 "이 씬을 더 어둡게" 같은 편집 지시 |
| **Export** | PDF 피치덱, JSON 에셋 매니페스트, XML 타임라인(Premiere/FCP 호환) |
| **한계** | 숏 간 연속성 제어가 약함 — 첫/끝 프레임 조건 설정 기능 없음 |

### 1-B. Higgsfield Cinema Studio 3.5

| 기능 | 설명 |
|---|---|
| **AI Director (Mr. Higgs)** | 씬 설명 → 자동으로 숏 분해 + 카메라·조명·렌즈 세팅 |
| **8개 촬영 파라미터** | Genre, Color Palette, Camera MoveSet, Lighting, Camera, Lens, Focal Length, Aperture |
| **Elements 시스템** | 캐릭터·장소·소품을 프로젝트 내 재사용 에셋으로 등록, `@tag`로 프롬프트에서 참조 |
| **Soul ID** | 학습 기반 얼굴 일관성 레이어 — 같은 인물이 여러 씬에 등장해도 drift 방지 |
| **Multi-Shot 시퀀스** | 숏별 타임코드(0.0-2.0s, 2.0-4.0s…) + 키프레임 참조 + 컷 연결 지시 |
| **Cinema Studio × 15+ 모델** | Veo 3.1로 초안 → Kling 3.0으로 멀티숏 연결 → LipSync Studio로 립싱크 |
| **가격** | $15~$129/월, 단일 크레딧 체계 |

### 1-C. MiniMax Design (구 MiniMax Hub)

| 기능 | 설명 |
|---|---|
| **노드 기반 캔버스** | 카피→이미지→영상→오디오가 노드 그래프로 연결, 각 단계 출력이 다음 입력 |
| **멀티 에이전트** | 카피/이미지/비디오/오디오 4개 전문 에이전트가 병렬 작업 |
| **H3 Joint Generation** | 비디오+스테레오 오디오 동시 생성 (같은 latent에서 디코딩) |
| **3가지 생성 모드** | t2v (프롬프트), flf2v (첫/끝 프레임 조건), r2v (레퍼런스 이미지 기반) |
| **스킬 에코시스템** | 단편드라마, 스토리보드, 광고, 이커머스 등 프리셋 워크플로우 |
| **품질 체크포인트** | 단계별 감독 승인 필수 — 자동 품질 검증 |
| **로컬 에셋 관리** | 파일 자동저장 + 통합 인덱싱 |

---

## 2. 캐릭터 바이블 & 일관성 관리 (2026 현황)

### 텍스트 바이블의 한계
- 2026년 기준 텍스트 기반 캐릭터 바이블만으로는 일관성 유지 불충분
- **레퍼런스 이미지가 정체성의 앵커** — 프롬프트는 씬(장소, 행동, 조명)만 기술

### 3가지 일관성 문제
1. **클립 내 안정성** (Within-clip): 한 숏 안에서 얼굴/의상 유지
2. **멀티 캐릭터** (Multi-character): 두 인물이 같은 프레임에서 각자 정체성 유지
3. **표정 범위** (Expression range): 감정 변화에도 동일 인물로 인식

### PLAYLAB 적용 전략
```
Character Bible = {
  텍스트 프로필 (이름, 나이, 체형, 특징),
  앵커 이미지 (정면/45도/전신 3장),
  스타일 잠금 (화풍, 색감, 조명 톤),
  금지 항목 (절대 변하면 안 되는 요소)
}
```

---

## 3. 자막 & 립싱크 통합 (2026 현황)

| 단계 | 도구/방식 | 정확도 |
|---|---|---|
| STT (음성→텍스트) | 네이티브 AI 엔진 (Premiere/CapCut/Resolve 내장) | 97%+ |
| 타이밍 동기화 | Word-level timestamp + 비주얼 타임라인 에디터 | ms 단위 |
| 번역 | 원클릭 54+ 언어 번역, 타이밍 유지 | 90%+ |
| 립싱크 | Higgsfield LipSync Studio, Digen AI 등 | 높은 정확도 |
| 스타일링 | 위치·크기·폰트·애니메이션 자동 최적화 | 플랫폼별 |

---

## 4. PLAYLAB 영상 스튜디오 프론트엔드 설계

### 4-A. 전체 레이아웃 (4패널 + 하단바)

```
┌──────────────────────────────────────────────────────────────┐
│  프로젝트 헤더: 제목 | 상태 배지 | 총 길이 | 예상 크레딧     │
├───────────┬────────────────────────────┬─────────────────────┤
│           │                            │                     │
│  좌측 패널 │      중앙 캔버스            │   우측 패널          │
│  240px    │      flex-1               │   360px             │
│           │                            │                     │
│  에셋     │   스토리보드 뷰             │   숏 인스펙터        │
│  매니저   │   (씬 → 숏 카드 그리드)      │   (선택된 숏 편집)   │
│           │                            │                     │
│  - 캐릭터 │   또는                      │   - 프롬프트         │
│  - 장소   │                            │   - 생성 방식        │
│  - 소품   │   타임라인 뷰               │   - 카메라 설정      │
│  - 스타일 │   (시간축 기반 클립 배치)     │   - 레퍼런스         │
│  - 오디오 │                            │   - 결과 후보        │
│           │                            │   - QC 점수         │
│           │                            │                     │
├───────────┴────────────────────────────┴─────────────────────┤
│  하단 바: 생성 큐 | 진행률 | 크레딧 잔여 | 렌더 프로필 선택    │
└──────────────────────────────────────────────────────────────┘
```

### 4-B. 좌측: 에셋 매니저 (Asset Manager)

Google Flow의 Ingredients + Higgsfield Elements를 결합한 구조:

```typescript
interface AssetLibrary {
  characters: CharacterAsset[];  // 이름, 앵커이미지 3장, 텍스트 프로필
  locations: LocationAsset[];    // 장소명, 레퍼런스 이미지, 조명/시간대
  props: PropAsset[];            // 소품명, 이미지, 크기/재질
  styles: StylePreset[];         // 화풍, 색감, 필름 그레인 등
  audio: AudioAsset[];           // BGM, 효과음, 보이스오버
}
```

- 에셋은 프로젝트에 귀속, 숏에서 `@캐릭터명`으로 참조 (Higgsfield 방식)
- 드래그앤드롭으로 숏에 에셋 할당
- 캐릭터 바이블 편집 모달: 텍스트 + 앵커 이미지 + 금지 항목

### 4-C. 중앙: 듀얼 뷰 캔버스

#### 뷰 1 — 스토리보드 (기본)
```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ 씬 1    │  │ 씬 1    │  │ 씬 2    │  │ 씬 2    │
│ 숏 1    │  │ 숏 2    │  │ 숏 1    │  │ 숏 2    │
│         │  │         │  │         │  │         │
│ [썸네일] │  │ [썸네일] │  │ [썸네일] │  │ [생성중] │
│ 0:00-   │  │ 0:04-   │  │ 0:08-   │  │ 0:12-   │
│ 0:04    │  │ 0:08    │  │ 0:12    │  │ 0:16    │
│ ✅ QC   │  │ ✅ QC   │  │ ⏳ 생성중│  │ 📝 대기 │
│ wan26   │  │ wan26   │  │ h3      │  │ h3      │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
     ↗ 연결 프레임                ↗ 연결 프레임
```

- 카드 재정렬: 드래그앤드롭
- 카드 컨텍스트 메뉴: "이전 숏 끝 프레임을 시작 프레임으로 사용", "결과를 레퍼런스로 추가"
- 씬 구분선 + 씬 제목 편집
- 숏 카드 하단: 사용 모델 뱃지 + QC 상태

#### 뷰 2 — 타임라인
```
시간  0s    4s    8s   12s   16s   20s   24s
      ├─────┼─────┼─────┼─────┼─────┼─────┤
Video │ S1-1│ S1-2│ S2-1│ S2-2│ S3-1│     │
      ├─────┼─────┼─────┼─────┼─────┼─────┤
Audio │ ♫ BGM ────────────────────────────│
      ├─────┼─────┼─────┼─────┼─────┼─────┤
Voice │     │ 나레│이션 │     │ 나레│이션 │
      ├─────┼─────┼─────┼─────┼─────┼─────┤
Subs  │자막1│자막2│자막3│자막4│자막5│     │
      └─────┴─────┴─────┴─────┴─────┴─────┘
```

- 클립 길이 조절 (드래그)
- 트랜지션 삽입 (클립 사이 `+` 버튼)
- 오디오 트랙: BGM, 나레이션, 효과음 각각 독립
- 자막 트랙: 자동 생성 + 수동 편집

### 4-D. 우측: 숏 인스펙터 (Shot Inspector)

선택된 숏의 모든 설정을 편집하는 패널:

```
┌─────────────────────────┐
│ 숏 인스펙터              │
│                         │
│ ▸ 생성 방식              │
│   ○ 프롬프트 → 영상      │
│   ○ 이미지 → 영상        │
│   ○ 첫 프레임 + 끝 프레임 │
│   ○ 레퍼런스 기반         │
│                         │
│ ▸ 프롬프트               │
│   [텍스트 영역]          │
│   @주인공 @카페          │
│                         │
│ ▸ 프레임 제어            │
│   시작 프레임: [이미지]   │
│   끝 프레임:  [이미지]    │
│   └ 이전 숏에서 가져오기  │
│                         │
│ ▸ 카메라 & 촬영 설정     │
│   모델: [wan26 ▾]       │
│   무브셋: [Epic Scale ▾] │
│   렌즈: [35mm ▾]        │
│   조리개: [f/2.8 ▾]     │
│   조명: [Soft Cross ▾]  │
│                         │
│ ▸ 생성 결과 (후보)       │
│   ┌───┐ ┌───┐ ┌───┐    │
│   │ A │ │ B │ │ C │    │
│   │ ★ │ │   │ │   │    │
│   └───┘ └───┘ └───┘    │
│   [재생성] [선택 확정]   │
│                         │
│ ▸ QC 결과                │
│   정체성: ✅ 0.95        │
│   의상:   ✅ 0.91        │
│   플리커: ✅ 0.88        │
│   모션:   ⚠️ 0.72       │
│   립싱크: ✅ 0.94        │
│                         │
│ ▸ 렌더 프로필            │
│   ○ Preview (빠름/저품) │
│   ● Standard            │
│   ○ Hero (고품/느림)    │
└─────────────────────────┘
```

### 4-E. 하단: 생성 큐 & 상태 바

```
┌──────────────────────────────────────────────────────────────┐
│ 큐: 3/5 완료 │ ████████░░ 60% │ 크레딧: 47/100 사용 │ ETA 2분 │
│                                                              │
│ [S1-숏2 wan26 ✅] [S2-숏1 h3 ⏳ 43%] [S2-숏2 h3 📋 대기]    │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. 생성 워크플로우 (3단계 렌더 전략)

MiniMax Design의 품질 체크포인트 + Higgsfield의 멀티모델 전략을 결합:

### Stage 1: 스토리보드 초안 (Draft)
```
입력: 스크립트 텍스트
  ↓
AI Director: 씬 분해 → 숏 리스트 + 프롬프트 초안 생성
  ↓
각 숏 → Preview 렌더 (빠르고 저렴한 모델/설정)
  ↓
사용자: 스토리보드 카드로 확인, 순서 조정, 프롬프트 수정
```

### Stage 2: 숏별 정밀 생성 (Production)
```
확정된 숏 → Standard/Hero 렌더 프로필로 재생성
  ↓
생성 방식 선택:
  - 프롬프트만 → t2v
  - 이전 숏 끝 프레임 → flf2v (연속성 확보)
  - 캐릭터 앵커 이미지 → r2v (정체성 유지)
  ↓
QC 자동 검증 → 통과 시 확정, 실패 시 재생성/수동 보정
  ↓
후보 여러 개 중 선택 → 선택된 결과의 마지막 프레임이
다음 숏의 시작 프레임 후보로 자동 제안
```

### Stage 3: 최종 어셈블리 (Post-Production)
```
확정된 클립들 →
  ↓ 타임라인에 배치
  ↓ 트랜지션 삽입
  ↓ BGM/나레이션/효과음 레이어링
  ↓ 자막 자동 생성 → 수동 교정
  ↓ 컬러 그레이딩 (프리셋)
  ↓
최종 렌더 (Remotion/FFmpeg) → MP4 내보내기
```

---

## 6. 데이터 모델 확장 (기존 types.ts 기준)

현재 `VideoProjectDTO` → `VideoShotDTO` 2레벨 구조에 **씬(Scene)** 레벨 추가:

```typescript
// 프로젝트 > 씬 > 숏 (3레벨)
interface VideoSceneDTO {
  id: string;
  projectId: string;
  sceneIndex: number;
  title: string;           // "카페에서의 만남"
  description: string;     // 씬 설명
  shots: VideoShotDTO[];
}

// 에셋 라이브러리
interface VideoAssetDTO {
  id: string;
  projectId: string;
  category: 'character' | 'location' | 'prop' | 'style' | 'audio';
  name: string;
  tag: string;             // @주인공, @카페 등 프롬프트 참조용
  profile?: string;        // 텍스트 프로필
  anchorImages: string[];  // 레퍼런스 이미지 URL들
  constraints?: string[];  // 금지 항목
  metadata?: Record<string, unknown>;
}

// 숏 생성 모드
type GenerationMode = 'text-to-video' | 'image-to-video' | 'first-last-frame' | 'reference-driven';

// 숏 후보 (한 숏에 여러 생성 결과)
interface ShotCandidateDTO {
  id: string;
  shotId: string;
  videoUrl: string;
  thumbnailUrl: string;
  selected: boolean;       // 채택 여부
  qcResult?: QcResult;
  seed: number;
  createdAt: string;
}

// 타임라인 트랙 (오디오, 자막 등)
interface TimelineTrackDTO {
  id: string;
  projectId: string;
  type: 'bgm' | 'narration' | 'sfx' | 'subtitle';
  fileUrl?: string;
  entries: TimelineEntryDTO[];
}

interface TimelineEntryDTO {
  id: string;
  trackId: string;
  startSec: number;
  endSec: number;
  content: string;         // 자막 텍스트 또는 오디오 파일 URL
  metadata?: Record<string, unknown>;
}
```

### 기존 VideoShotDTO 확장 필요 항목
```typescript
// 추가 필드
generationMode: GenerationMode;
startFrameUrl?: string;     // 시작 프레임 이미지
endFrameUrl?: string;       // 끝 프레임 이미지
assetTags: string[];        // 참조된 에셋 태그들 ["@주인공", "@카페"]
cameraSettings?: {
  genre?: string;
  colorPalette?: string;
  moveSet?: string;
  lighting?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
};
candidates: ShotCandidateDTO[];  // 생성 후보들
sceneId: string;                 // 소속 씬
```

---

## 7. 핵심 인터랙션 패턴

### 7-A. 숏 연결 (Shot Chaining)
```
숏 A 완료 → 마지막 프레임 자동 추출
  ↓
숏 B 인스펙터에 "이전 숏 끝 프레임" 버튼 활성화
  ↓
클릭 시 → 숏 B의 startFrameUrl에 자동 설정
  ↓
생성 모드 자동 전환: first-last-frame
```

### 7-B. AI Director 워크플로우
```
사용자: 스크립트 텍스트 입력 (또는 붙여넣기)
  ↓
AI Director API 호출:
  - 씬 분해
  - 각 씬의 숏 리스트 생성
  - 숏별 프롬프트 + 카메라 설정 초안
  - 에셋 자동 식별 (캐릭터, 장소)
  ↓
스토리보드에 카드 자동 배치
  ↓
사용자: 카드 재정렬, 프롬프트 수정, 에셋 확인
  ↓
"전체 Preview 생성" 버튼 → 모든 숏 Preview 렌더
```

### 7-C. 품질 체크포인트 (Quality Gate)
```
MiniMax Design 방식 차용:

Draft → [사용자 승인] → Production 렌더
Production → [QC 자동 검증] → 통과/실패
  ├─ 통과 → 확정 (타임라인에 배치 가능)
  └─ 실패 → 재생성 옵션 제안 (프롬프트 수정/시드 변경/모델 변경)
```

---

## 8. 구현 우선순위

### Phase A — MVP (즉시)
1. 프로젝트 생성 + 숏 리스트 (씬 없이 flat)
2. 숏별 프롬프트 편집 + 모델 선택 + 생성 요청
3. 결과 확인 + 선택
4. 선택된 클립들 연결해서 다운로드

### Phase B — 스토리보드 (1~2주)
5. 씬 레벨 추가 (씬 > 숏 2레벨)
6. 에셋 매니저 (캐릭터 바이블 + 레퍼런스 이미지)
7. 숏 연결 (이전 숏 끝 프레임 → 다음 숏 시작 프레임)
8. 스토리보드 카드 뷰 + 드래그 재정렬

### Phase C — 타임라인 & 포스트 (2~4주)
9. 타임라인 뷰 (비디오 + 오디오 + 자막 트랙)
10. BGM/나레이션 업로드 + 배치
11. 자막 자동 생성 + 편집
12. 최종 렌더 (Remotion/FFmpeg)

### Phase D — AI Director & 고급 (4주+)
13. AI Director (스크립트 → 씬/숏 자동 분해)
14. 카메라 설정 프리셋 (Higgsfield 스타일)
15. QC 자동 검증 + 재생성 루프
16. 실시간 협업

---

## 9. 기술 스택 결정 포인트

| 결정 | 옵션 | 권장 |
|---|---|---|
| 타임라인 UI | 커스텀 Canvas vs react-timeline-editor vs Remotion Player | react-timeline-editor (가볍고 확장 가능) |
| 비디오 프리뷰 | `<video>` + MediaSource vs Remotion Player | Remotion Player (프레임 정밀 제어) |
| 드래그앤드롭 | react-dnd vs @dnd-kit | @dnd-kit (접근성, 키보드) |
| 카드 레이아웃 | CSS Grid vs Masonry | CSS Grid (일정 크기 카드) |
| 상태 관리 | zustand store 확장 | 기존 store에 videoStudio slice 추가 |
| 실시간 진행률 | Polling vs WebSocket vs SSE | SSE (RunPod 워커 → API → 클라이언트) |
| 최종 렌더 | 클라이언트 Remotion vs 서버 FFmpeg | 서버 FFmpeg (안정적, 긴 영상) |

---

## Sources

- [Google Flow AI Filmmaking Guide](https://www.geeky-gadgets.com/google-flow-ai-filmmaking/)
- [Google Flow Storyboard Studio](https://www.aisuites.ai/blog/google-flow-storyboard-studio/)
- [Google Flow AI 2026 Complete Guide](https://whiskailabs.net/google-flow-ai-complete-guide/)
- [Higgsfield Cinema Studio 3.5 Tutorial](https://higgsfield.ai/blog/cinema-studio-3.5-full-tutorial)
- [Higgsfield AI Features 2026](https://geo.higgsfield.ai/higgsfield-ai-features-full-guide-2026)
- [Higgsfield Best AI Video Generators 2026](https://higgsfield.ai/blog/best-ai-video-generators-2026)
- [MiniMax Hub Multi-Agent Orchestration](https://aivideoadvisor.com/minimax-hub-turns-ai-video-creation-into-a-desktop-studio-with-multi-agent-orchestration/)
- [MiniMax Design Studio](https://design.minimax.io/)
- [MiniMax H3 ComfyUI Pipeline](https://www.marktechpost.com/2026/08/10/implementing-a-minimax-h3-multimodal-video-and-audio-generation-pipeline-with-comfyui-apis/)
- [AI Character Consistency 2026](https://www.kittl.com/blogs/ai-video-character-consistency-workflow/)
- [Character Consistency Guide](https://rendar.ai/blog/character-consistency-in-ai-video-generation-complete-guide)
