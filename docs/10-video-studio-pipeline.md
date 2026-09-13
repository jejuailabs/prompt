# 10. Video Studio Pipeline — Track A (H3 중심)

## 개요

원고/주제 입력 → AI가 스토리보드 초안 생성 → 사용자가 장면 단위로 세밀하게 편집 → 최종 영상 렌더링.
완전 무인 One-click이 아니라 **"AI 초안 + 장면 단위 편집"** 형태의 AI Video Studio.

---

## 1. 파이프라인 10단계

```
[0] Policy/License Gate — H3 승인 상태 확인, 모델 가용성 판정
[1] Director Engine — Story/Character/Location/Cinematography/Audio Bible 생성
[2] Master Audio — TTS 생성 → Forced Alignment으로 타임스탬프 확보
[3] Editor Engine — 실제 음성 시간 기준 Shot/Beat 재설계
[4] Reference Asset Engine — Identity Pack + Continuity 메타데이터
[5] Model Router — 샷 성격별 모델 자동 선택 (H3/Wan/LTX)
[6] Video Generation — Preview → Standard → Hero 3단계 렌더
[7] Automatic QC Gate — 실패 샷만 선택 재생성
[8] Restoration / Upscale — SeedVR2 우선
[9] Editorial + Sound — J/L-Cut, MMAudio
[10] Color + Audio Master — Shot Matching → LUT → LUFS 마스터링
```

## 2. 4대 원칙

1. **Audio-First 2-pass**: TTS → Alignment → 샷 재설계
2. **Reference Bank + Canonical Reference 재주입**: drift 방지
3. **자동 QC + 실패 샷만 재생성**: 전체 재생성 금지
4. **Preview / Standard / Hero 렌더 프로파일 분리**

## 3. 렌더 프로파일

| 프로파일 | 해상도 | Step | 용도 |
|---|---|---|---|
| Preview | 480p | 4-step | 구도·동작·타이밍 확인 |
| Standard | 704~768p | 8-step | 일반 장면 |
| Hero | 768p 고품질 | 8~12-step | 클로즈업, 감정 연기, 핵심 샷 |

## 4. 모델 라우터 원칙

| 상황 | 모델 |
|---|---|
| 기본·다중 레퍼런스 | MiniMax H3 (FL2VA / Ref2VA) |
| H3 승인 전 | H3 공식 API |
| H3 승인 후 | RunPod 셀프호스팅 |
| 비용 민감 / 프리뷰 / 폴백 | Wan2.2 계열 |
| 복잡한 연기 | Wan-Animate-2 |
| 오디오+영상 통합 | LTX-2.x (매출 조건 검토) |

## 5. Identity Pack 구성 (캐릭터당)

```
front.png, three_quarter.png, profile.png, full_body.png
주요 표정 (neutral / angry / smiling 등)
대표 의상 전면/후면
주요 소품
```

매 샷마다 Canonical Reference를 기본 주입, 이전 Last Frame은 Continuity Hint로만 사용.
매 3~4샷마다 Canonical Reference 강하게 재주입.

## 6. QC 검사 항목

- Identity: 캐릭터 얼굴/체형 일치
- Costume: 의상/소품 일관성
- Flicker: 프레임 간 깜빡임
- Motion: 동작 자연스러움
- Lip-sync: 입모양-음성 동기화 (나레이션 샷)

## 7. GPU 인프라 (RunPod Serverless)

- RTX 5090 Serverless ~$1.58/h (초 단위 과금, scale to 0)
- Network Volume에 모델 가중치 캐싱 (cold start 최소화)
- ComfyUI Headless로 워크플로우 실행

## 8. 사용자 UI 구성

### 프로젝트 생성 화면
- 원고/주제 입력 (텍스트 또는 파일)
- 영상 길이 선택 (15s / 30s / 60s)
- 스타일/톤 선택

### 스토리보드 에디터 (핵심 UI)
- 타임라인 뷰: 샷 목록을 시간순 나열
- 각 샷 카드: 썸네일, 나레이션 텍스트, 프롬프트, 카메라, 모델 선택
- 샷별 액션: 재생성 / 모델 변경 / 프롬프트 수정 / 렌더 프로파일 업그레이드
- Reference Pack 관리 패널

### 결과 화면
- 비디오 플레이어
- 갤러리 게시 / 다운로드

## 9. DB 테이블 (docs/05에 추가)

- `video_projects`: 프로젝트 메타데이터
- `video_shots`: 개별 샷 (프롬프트, 모델, 렌더 프로파일, QC 결과)
- `reference_packs`: Identity Pack (캐릭터별 참조 이미지 세트)
- `reference_images`: Pack 내 개별 이미지
- `compute_jobs`: RunPod GPU 작업 추적

## 10. 모듈 등록

```ts
{
  id: 'video-studio',
  phase: 3,
  titleKo: 'AI 영상 스튜디오',
  titleEn: 'AI Video Studio',
  icon: 'film',
  navOrder: 50,
  entryView: 'video-studio',
  group: 'studio',
  status: 'new',
}
```
