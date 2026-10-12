# 랜딩페이지 ZIP 보관·미리보기

2026-10-11 사용자 요청. 새 메뉴는 모듈 레지스트리 `src/modules/landing-pages/module.config.ts`에 등록한다. 기존 PLAYLAB 디자인·뷰 라우터·Google/Supabase 로그인·Prisma DB 연결·Supabase 서버 관리 클라이언트와 API 응답 규약을 재사용한다.

## 구현 범위

- 내 계정의 제목·설명·ZIP 등록, 등록일/처리 상태 카드, 이름·설명 수정, ZIP 교체, 삭제 확인.
- ZIP 최상위 또는 감싸는 폴더 한 단계 안의 `index.html`을 자동 선택. 여러 후보·누락·지원하지 않는 파일·경로는 원인을 표시.
- ZIP 안의 파일명/폴더 구조/원본 바이트와 SHA-256을 보관. HTML/CSS/JS의 경로 변환은 응답을 제공할 때만 수행한다.
- HTML·CSS·브라우저 JS·이미지·SVG·폰트·MP4/WebM·MP3/OGG/WAV 정적 파일. 미디어 부분 요청도 지원한다.
- HTML/CSS/브라우저 JS의 고정 참조, 상대 URL, /assets 등의 루트 URL, CSS import/url, JS import/fetch/new URL/XHR를 검증·연결한다. 내부 HTML·앵커 링크를 지원한다.
- PC 1200 / 태블릿 768 / 모바일 390 전환은 실제 iframe 너비를 바꾼다. 모달/페이지 내부 스크롤, 로딩·리소스 오류·재시도, 닫기·ESC, 반복 열기 지원.
- iframe을 제거해 영상·음성·타이머를 정리하고 해당 미리보기 세션을 폐기한다. 세션 최대 수 10개/페이지, 만료 30분.
- 새 ZIP 검증과 객체 저장이 끝난 뒤 DB에서 버전을 원자적으로 전환한다. 실패하면 기존 활성 파일과 미리보기는 유지한다. 동시 이름 수정은 메타데이터 갱신으로 덮어쓰지 않는다.
- 직접 업로드는 Supabase signed TUS 토큰과 6MiB 청크를 사용한다. 브라우저 진행률을 표시하며 ZIP 자체를 Vercel API 요청 본문으로 보내지 않는다.

## 보관·권한 구조

기존 public.Artifact는 읽기 검사에서 RLS=false/정책 없음이 확인됐다. 개인 페이지를 여기에 추가하거나 기존 전체 아티팩트 권한을 바꾸지 않고, `landing_private.pages`를 별도로 사용한다. 제목·소유자·설명·등록일은 컬럼, 진입점·저장 prefix·파일 목록·상태·버전·미리보기 세션은 JSONB에 영구 저장한다. 기존 Prisma 연결로 매개변수 SQL을 사용하며 공개 Data API에 이 스키마를 추가하지 않는다.

객체는 비공개 Supabase `landing-pages` 버킷에 보관한다.

```
<owner UUID>/<page UUID>/<version UUID>/upload.zip
<owner UUID>/<page UUID>/<version UUID>/files/<ZIP 안의 원래 경로>
```

서버에서 검증한 로그인 사용자만 목록·수정·교체·삭제·미리보기 권한 발급을 할 수 있다. 다른 사용자의 ID 요청은 404이다. 공개 공유·공개 갤러리 등록·영구 공개 URL은 제공하지 않는다.

미리보기는 앱과 쿠키 사이트가 다른 별도 HTTPS origin의 `/landing-preview/<단기 서명 권한>/<파일>`에서 제공한다. 권한은 소유자 인증 후 발급하고 페이지/버전/세션/만료를 서명·DB와 대조한다. 단기 URL은 bearer 권한이므로 비공개로 취급하며 URL 로그·외부 referrer를 남기지 않는다. 닫기·교체·삭제 시 폐기하고 서버 API 권한으로 사용할 수 없다.

iframe은 `allow-scripts allow-forms`만 허용한다. allow-same-origin·top-navigation·popups·downloads·storage 권한을 주지 않는다. CSP는 폼의 서버 전송·하위 iframe·Worker·object를 금지하며 앱 출처를 리소스로 참조하지 못하게 한다. allow-forms는 로컬 브라우저 폼 이벤트/검증을 위한 권한이다. 실제 외부 폼 전송은 CSP form-action none으로 차단한다. 카메라·마이크·위치·결제도 금지한다.

Supabase의 HTML 객체 URL을 iframe에 직접 넣지 않는다. 서버가 비공개 객체의 바이트를 제한된 크기로 읽고 무결성을 확인한 뒤 미리보기 출처에서 `text/html` 등 실제 MIME으로 응답한다. Storage의 HTML 제공/첨부 다운로드 정책과 분리된다. 앱 쿠키·OAuth 토큰·service_role 키는 업로드 HTML에 전달하지 않는다.

## 제한과 지원 범위

| 항목 | 제한 |
|---|---|
| ZIP | 50MiB |
| 압축 해제 총량 | 150MiB |
| 파일 수 | 1,000 |
| 개별 파일 | 20MiB |
| HTML/CSS/JS/JSON/SVG | 각 2MiB |
| 압축 비율 | 1MiB 초과 파일은 200배 이하 |
| 경로 | 500자/UTF-8 800바이트 이하 |
| 파일명 | UTF-8, Unicode Path 확장, Windows 한글 CP949; 파일 내용은 UTF-8 |
| 외부 URL | 공개 HTTPS 호스트만; 원격 리소스 제공자의 네트워크/CORS에 의존 |
| 중단 복구 | 업로드 2시간, 검증 10분 경과 시 재교체/삭제 가능 |

경로 탈출·절대 경로·Windows 드라이브·심볼릭 링크·중복 이름·암호화/분할/ZIP64·중첩 압축·숨김 설정·비밀 파일·npm/빌드 설정·서버 확장자는 차단한다. 실제 서버 실행·npm 설치·빌드는 하지 않는다.

동적 fetch/import 주소·Worker·import map·다른 base 태그·자동 이동/CSP meta·중첩 iframe은 지원하지 않는다. 고정 blob URL은 다시 열 때 유지되지 않으므로 실제 파일로 바꿔야 한다. 고정 참조 누락은 등록 시 오류, 런타임 리소스/CSP/스크립트 오류는 모달에 안내한다. 브라우저 저장소를 사용하는 코드는 sandbox 제한을 처리해야 한다.

버전 파일은 삭제 때 함께 정리한다. 취소/삭제 뒤 이미 발급된 원본 ZIP의 업로드 토큰은 공급자 만료(최대 2시간)까지 남을 수 있다. 이 경우 메타데이터/미리보기는 복구되지 않으며, 장기 운영 시 만료 후 고아 업로드를 청소할 작업을 별도로 마련해야 한다.

## 남원 원본 검사

원본: `C:/Users/na/Desktop/남원 10주년 기념행사 샘플 랜딩페이지`.
기존 압축파일은 사용하지 않고 index.html과 assets 폴더의 이미지 11개를 직접 읽었다. HTML 안에 CSS·JS가 있고 Google Fonts/Inter Tight, fonts.gstatic.com, jsDelivr/Pretendard를 외부 참조한다. 신청은 원본에 명시된 모의 접수이고 메시지 벽의 localStorage는 try/catch로 제한을 처리한다.

테스트 ZIP: `tmp/landing-qa/남원 기념행사.zip`.
12개 파일, ZIP 1,862,101바이트 / 해제 1,904,331바이트. 원본 파일을 편집·이동·삭제하지 않았다.

## 운영 적용 전에 필요한 항목 — 아직 적용 안 함

1. `supabase/migrations/20261011102243_landing_pages_private_storage.sql` 검토·적용. 비공개 schema/table, auth.users FK, 인덱스/RLS, anon/authenticated 접근 취소, service_role 권한, 비공개 50MiB 버킷, 기존 광범위 Storage 정책의 우회 차단을 포함한다. public.Artifact를 변경하지 않는다.
2. 서버 DB 계정이 새 비공개 스키마를 사용할 권한이 있는지 확인한다. 기본 PostgreSQL 소유자 또는 권한을 받은 서버 역할을 사용한다. RLS/Storage advisor와 실제 일반 사용자 접근도 적용 뒤 다시 확인한다.
3. **기존 Vercel 프로젝트 한 개**에 미리보기용 별도 등록 도메인을 연결한다. 페이지별 프로젝트·배포는 만들지 않는다. 앱과 포트만 다른 주소나 같은 상위 쿠키 도메인의 형제 호스트는 사용하지 않는다.
4. 환경변수 설정:

```dotenv
LANDING_APP_ORIGIN=https://<기존 앱 origin>
LANDING_PREVIEW_ORIGIN=https://<다른 쿠키 사이트의 미리보기 origin>
LANDING_PREVIEW_SECRET=<암호학적으로 무작위인 32바이트 이상 비밀 키>
```

기존 DATABASE_URL·NEXT_PUBLIC_SUPABASE_URL·NEXT_PUBLIC_SUPABASE_ANON_KEY·SUPABASE_SERVICE_ROLE_KEY를 재사용한다. 미리보기 origin은 경로/쿼리 없이 지정한다. 두 origin은 같은 코드·DB·서명 키를 사용한다. 미리보기 호스트의 앱/인증/API/정적 파일 접근은 미리보기 경로 외에는 거부한다.
5. 실제 Supabase signed TUS, 한글/공백 객체 키, 비공개 HTML 다운로드 후 제공, 정책 적용, 운영 Google 로그인, HTTPS/커스텀 도메인을 확인한 뒤 push·배포한다. 이 단계는 이번 로컬 검증에 포함하지 않았다.

## 로컬 검증과 재실행

`scripts/landing-pages/start-local.ps1`은 루프백 전용 앱(4186)과 TUS 객체 저장 서버(4188)를 시작한다. 앱: http://127.0.0.1:4186/app#landing-pages / 미리보기: http://localhost:4186 . 로컬 테스트 버튼으로 들어갈 수 있다.

개발 모드+LANDING_LOCAL_TEST_MODE=1일 때만 테스트 계정과 디스크 객체 저장소/SQLite를 사용한다. 데이터는 tmp/landing-local에 남아 재시작/새로고침 후에도 유지된다. 이는 운영 영구 저장 방식이 아니다. 운영은 비공개 PostgreSQL+Supabase 객체 저장소이며 production에서는 테스트 로그인/로컬 저장 어댑터가 활성화되지 않는다.

```
npx tsx scripts/landing-pages/inspect-sample.ts
node --import tsx --test tests/landing-pages.test.ts tests/landing-pages-postgres.test.ts
node scripts/landing-pages/browser-qa.mjs
```

로컬 PostgreSQL(PGlite)은 운영 SQL과 실제 서버 repository 쿼리·FK·ACL·RLS·기존 버킷 정책 보존을 검증한다. 브라우저 검증은 실제 UI→직접 업로드→서버 DB/객체 저장→분리 출처의 HTML을 사용하며 인메모리 카드나 srcdoc만으로 검사하지 않는다. 실기기 Safari·운영 Supabase 설정·공개 배포는 별도 확인 대상이다.

## 최종 검증 결과 — 2026-10-11

| 검사 | 결과 |
|---|---|
| ZIP/경로/리소스/권한/교체/폐기 + 실제 PostgreSQL SQL/쿼리/ACL | 11개 통과 |
| 남원 실제 UI 등록→목록→HTML 모달 | 통과 |
| 이미지 11개·Inter Tight/Pretendard·신청 버튼·필터·스탬프·48개 애니메이션 | 통과 |
| 390/768 너비·ESC·반복 열기·닫은 URL 폐기 | 통과 |
| 새로고침/재로그인 및 서버 재시작 후 목록/파일 보존 | 통과 — 로컬 SQLite/객체 저장 fixture |
| 잘못된 ZIP·누락·크기 제한·다른 사용자 목록/수정/교체/삭제/미리보기 | 통과 |
| 실패한 ZIP 교체 뒤 기존 HTML 유지 / 검증된 새 버전 전환 | 통과 |
| 한글/공백 HTML·CSS·JS·이미지·폰트와 /assets·내부 링크 | 통과 |
| 음성 재생·206 부분 응답·닫은 뒤 iframe/heartbeat 정리 | 통과 |
| production 테스트 로그인 거부 | 통과 — 404 |
| TypeScript npx tsc --noEmit --incremental false | 통과 |
| 변경 파일 ESLint | 오류 0, 기존 store.ts 경고 1 |
| 전체 npm run lint | 실패 — 719 errors / 26,522 warnings, 기존 외부 게임 라이브러리·임시 파일 등. 새 랜딩페이지 파일 오류 없음 |
| 기본 npm run build | 최종 통과 — Prisma generate/Next 기본 Turbopack/타입/페이지 생성 |
| 운영 DB/Storage 정책·실제 Supabase signed TUS·운영 OAuth/HTTPS·실기기 Safari·push/배포 | 미실행 |

첫 기본 빌드는 접근 제한된 local-h3-benchmark SSH 키의 파일 추적에서 실패했다. 개발 디스크 어댑터의 NODE_ENV 분기를 명시해 운영 번들에서 제외하고 local-h3-benchmark/tmp 추적도 제외한 뒤 기본 빌드 전체가 통과했다. 키 파일은 읽거나 수정하지 않았다. 대체 Webpack 빌드는 중간 중단했고, 최종 검증은 기본 빌드로 수행했다.

검사 로그/화면은 Git 제외 경로 tmp/landing-qa의 tests.txt, browser-qa.txt, scoped-lint.txt, full-lint.txt, build-final.txt, namwon-desktop.png, namwon-mobile-view.png에 있다. 운영 설정 전에는 기본 앱의 랜딩페이지 API가 설정 필요 상태를 안내하며 테스트 데이터가 운영 DB에 섞이지 않는다.
