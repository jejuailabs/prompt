# 08. 만들어보기 — 샌드박스 실행

> **핵심 원칙: 회원이 올린 코드는 본 사이트 도메인에서 절대 실행하지 않습니다.**
> 같은 도메인에서 실행하면 그 코드가 로그인 쿠키·토큰에 접근하거나, 사이트를 흉내 낸 화면을 띄울 수 있습니다.

## 1. 등록 방식과 단계

| 방식 | 내용 | 도입 단계 |
|---|---|---|
| 외부 링크 | 이미 배포된 URL (Vercel, Netlify, GitHub Pages 등) | 1단계 (새 탭으로 열기 또는 iframe) |
| ZIP 업로드 (정적) | 빌드가 끝난 `index.html` + JS/CSS/에셋 | **2단계 핵심** |
| GitHub 저장소 (정적) | 저장소에 `index.html`이 있거나 `dist/` 폴더가 있는 경우 | 2단계 |
| GitHub 저장소 (빌드 필요) | React/Vite 등 빌드가 필요한 프로젝트 | 3단계 |
| 모션그래픽 | MP4 미리보기, Lottie JSON (페이지 안에서 재생) | 2단계 |

## 2. 실행 구조

```
본 사이트 (coai.kr)                          샌드박스 도메인 (coai-play.app — 이름 미정)
┌───────────────────────────┐                ┌──────────────────────────────────┐
│ 작품 상세 → [▶ 실행하기]   │                │  /p/{projectId}/{buildId}/index.html │
│   ┌─────────────────────┐ │   iframe src   │   정적 파일만 서빙                  │
│   │ Modal               │ │ ─────────────► │   쿠키 없음, 로그인 없음            │
│   │ <iframe sandbox …>  │ │                │   엄격한 응답 헤더 (아래)            │
│   └─────────────────────┘ │                └──────────────────────────────────┘
└───────────────────────────┘
```

### 2.1 iframe 속성
```html
<iframe
  src="https://{SANDBOX_ORIGIN}/p/{projectId}/{buildId}/index.html"
  sandbox="allow-scripts allow-pointer-lock allow-popups-to-escape-sandbox"
  allow="fullscreen; gamepad; autoplay"
  referrerpolicy="no-referrer"
  loading="lazy"
  title="{작품 제목} 실행 화면"
></iframe>
```
- **`allow-same-origin`은 넣지 않습니다.** (`allow-scripts`와 함께 쓰면 샌드박스를 벗어날 수 있습니다.)
- 이 설정에서는 작품 안에서 localStorage를 쓸 수 없습니다. 게임 저장 기능이 꼭 필요한 작품은 안내 문구를 붙이거나, 3단계에서 정책을 다시 검토합니다.
- `allow-forms`, `allow-top-navigation`은 기본으로 넣지 않습니다 (피싱 방지).

### 2.2 샌드박스 도메인 응답 헤더
```
Content-Security-Policy: default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;
                         connect-src 'self' https:;    # 필요하면 작품별 허용 목록으로 좁힘
                         frame-ancestors https://coai.kr https://*.vercel.app;
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Cache-Control: public, max-age=31536000, immutable      # buildId가 바뀌면 경로도 바뀜
```
- `frame-ancestors`로 우리 사이트 안에서만 띄울 수 있게 합니다 (다른 사이트에 퍼가서 악용하는 것 방지).

### 2.3 샌드박스 호스팅 선택지
| 선택지 | 장점 | 확인할 점 |
|---|---|---|
| 별도 Vercel 프로젝트 + 별도 도메인 | 운영 일원화 | 업로드 빌드를 동적으로 배포하는 방식(Vercel API 사용) 비용·제한 |
| Firebase Hosting (별도 사이트) + 별도 도메인 | Firebase와 통합 | 동적 배포 API 사용 가능 여부 |
| Cloudflare R2 / S3 + CDN | 정적 파일 대량 서빙에 적합, 경로 단위 배포 쉬움 | 별도 계정 관리 |

> 어떤 선택지가 가장 적합한지는 **각 서비스의 현재 요금과 API 제한을 확인한 뒤** 결정합니다 (확실하지 않음). 기본 추천은 "객체 저장소 + CDN" 방식입니다. 업로드된 ZIP을 풀어 `p/{projectId}/{buildId}/` 경로에 올리기만 하면 되기 때문입니다.

## 3. ZIP 업로드 처리 흐름

```
1. 회원: /make/new 에서 ZIP 선택
2. 브라우저 → /api/upload/zip : 서명된 업로드 URL 요청 (로그인, 등급 확인)
3. 브라우저 → Storage: projects/{id}/source.zip 업로드 (최대 30MB)
4. 브라우저 → /api/make/{id}/process 호출
5. 서버(Vercel Function):
   a. ZIP 다운로드, 압축 해제 전 검사
      - 파일 수 ≤ 500, 압축 해제 후 총 용량 ≤ 100MB (ZIP 폭탄 방지)
      - 경로에 '..' 또는 절대 경로가 있으면 거부 (zip slip 방지)
      - 허용 확장자만: html, css, js, mjs, json, png, jpg, jpeg, gif, webp, svg, mp3, ogg, wav, mp4, webm, woff, woff2, ttf, glb, gltf, wasm, txt, md
      - index.html 위치 확인 (루트 또는 단일 하위 폴더)
   b. 정적 검사(경고용): 'eval(', 'document.cookie', 'crypto mining' 관련 문자열, 'apiKey', 'sk-' 같은 키 패턴
   c. 샌드박스 저장소에 업로드: p/{projectId}/{buildId}/...
   d. projects/{id}.source.buildId, entry 기록, review.state = 'pending'
6. 운영진 승인 대기열에 등록 → 승인 체크리스트(docs/07) → 공개
```
- Vercel Function의 실행 시간과 메모리 제한을 넘을 수 있으니, ZIP 크기 상한은 제한값을 확인한 뒤 조정합니다.
- 큰 파일 처리가 필요하면 Cloud Run 같은 별도 작업 서버로 옮기는 것을 검토합니다.

## 4. GitHub 저장소 등록
- 입력: `https://github.com/{owner}/{repo}` + 브랜치 + 폴더 경로(기본 `/` 또는 `/dist`)
- 서버가 GitHub에서 해당 커밋의 압축 파일을 내려받아 **3장과 같은 ZIP 처리**를 합니다.
- 공개 저장소만 지원합니다. 등록 시점의 **커밋 SHA를 고정**해서, 나중에 저장소 내용이 바뀌어도 승인된 버전만 실행되게 합니다.
- "새 버전으로 업데이트"를 누르면 새 SHA로 다시 처리하고, 다시 승인을 받습니다.
- GitHub API의 요청 한도(비인증 요청은 한도가 낮음)를 고려해 서버용 토큰을 씁니다.

### 빌드가 필요한 저장소 (3단계)
- 선택지 A: 격리된 빌드 서버(컨테이너)에서 `npm ci && npm run build` 실행 후 결과물을 3장 흐름으로 업로드. 빌드 시간·메모리 제한, 네트워크 차단 필요
- 선택지 B: 브라우저 안에서 Node를 실행하는 기술(StackBlitz WebContainers 등). **상업적 이용 조건과 라이선스 비용은 확인하지 못했습니다(확실하지 않음).** 도입 전에 공식 문서를 확인합니다.

## 5. 실행 모달 UI
- PC: 화면의 90% 크기 모달 / 모바일: 전체 화면 시트
- 상단 바: 작품 제목 · [데스크톱|태블릿|모바일] 너비 전환(랜딩페이지 유형) · ↻ 다시 실행 · ⛶ 전체 화면 · ↗ 새 탭으로 열기(샌드박스 URL) · ✕ 닫기
- 처음 열 때 안내: "회원이 만든 작품입니다. 개인정보나 비밀번호를 입력하지 마세요."
- 하단: 🚩 신고 버튼 (사유에 "악성 코드" 포함)
- 실행 버튼을 누르면 `counts.runs`가 증가합니다 (1시간 중복 제한).
- 로딩 중에는 스켈레톤을, 10초 안에 응답이 없으면 "불러오지 못했어요 · 다시 시도"를 보여줍니다.

## 6. 신고와 긴급 차단
- 신고 3건이 쌓이면 자동으로 `runnable=false`로 바꾸고 운영진 검토를 기다립니다.
- 운영진이 "긴급 차단"하면 샌드박스 저장소의 해당 `buildId` 경로를 삭제하고 CDN 캐시를 지웁니다.
