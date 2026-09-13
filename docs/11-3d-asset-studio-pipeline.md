# 11. 3D Asset Studio Pipeline — Track B (TRELLIS + Blender)

## 개요

이미지/도면 입력 → 3D 에셋 생성 → Blender 후처리 → GLB/FBX 출력.
성격에 따라 3개 서브트랙으로 분리.

---

## 1. 서브트랙 정의

### ① 캐릭터 에셋
```
이미지 → TRELLIS.2 → Mesh+PBR
→ Blender 리토폴로지/리깅/웨이트
→ 기본 애니메이션 세트
→ GLB/FBX
```

### ② 실물·제품·건축 외관
```
사진 → TRELLIS.2 → Mesh+PBR
→ Blender 정리 + 카메라 자동 배치
→ GLB + 360° 뷰 + 홍보 렌더
```

### ③ 평면도 / 분양 도면 (최고 상품성)
```
도면 → OCR+Vision 치수 인식
→ Blender Procedural Modeling (실제 치수 기반)
→ 가구 배치 (TRELLIS 소품)
→ 렌더 / 360° / 분양 영상 / 웹 3D 뷰어
```

> TRELLIS는 ①②의 메인 엔진, ③에서는 소품 보조 엔진.
> 치수가 중요한 도면 작업은 절대 생성형 Image-to-3D에 맡기지 않는다.

## 2. 기술 스택

| 컴포넌트 | 기술 |
|---|---|
| Image-to-3D | TRELLIS.2 (MIT 라이선스) |
| 후처리/리깅/렌더 | Blender Headless (MCP 연동) |
| 도면 해석 | OCR + Vision LLM |
| 3D 뷰어 | Three.js / model-viewer |
| GPU | RunPod Serverless RTX 5090 |

## 3. QC 검사 항목

- Mesh Quality: 폴리곤 수, 매니폴드 검사
- Texture: PBR 텍스처 품질, UV 매핑
- Scale: 실제 치수 대비 정확도 (③ 전용)
- Animation: 리깅 품질, 모션 자연스러움 (① 전용)

## 4. 사용자 UI 구성

### 프로젝트 생성 화면
- 서브트랙 선택 (캐릭터 / 실물·건축 / 평면도)
- 입력 이미지/도면 업로드
- 스타일 옵션

### 에디터
- 3D 뷰어 (회전/줌/패닝)
- 머티리얼 조정 패널
- 카메라 앵글 프리셋
- 렌더 품질 선택

### 결과 화면
- GLB 다운로드
- 360° 뷰 공유 링크
- 갤러리 게시

## 5. DB 테이블 (docs/05에 추가)

- `asset3d_projects`: 3D 프로젝트 메타데이터
- `asset3d_outputs`: 생성된 3D 에셋 (GLB URL, 텍스처, 메시 정보)

## 6. 모듈 등록

```ts
{
  id: '3d-studio',
  phase: 3,
  titleKo: '3D 에셋 스튜디오',
  titleEn: '3D Asset Studio',
  icon: 'box',
  navOrder: 51,
  entryView: '3d-studio',
  group: 'studio',
  status: 'new',
}
```
