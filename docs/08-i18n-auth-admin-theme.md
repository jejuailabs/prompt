# 08. i18n / Auth / Admin / Theme 구현 스펙

## 1. 다국어 (i18n)

- 라이브러리: `next-intl`
- 기본 로케일: `ko`, 2순위: `en` (향후 확장 가능하도록 로케일 배열 구조로 관리)
- 라우팅: `/[locale]/...` 형태의 서브패스 방식 (`/ko/...`, `/en/...`), 미들웨어에서 브라우저 언어 감지 후 리다이렉트
- 메시지 파일: `/messages/ko.json`, `/messages/en.json` — 네임스페이스를 모듈 단위로 분리 (`prompt-wiki.json`처럼 모듈별 파일 분할도 고려, Phase 늘어날수록 단일 파일 비대화 방지)
- DB에 저장되는 사용자 생성 콘텐츠(프롬프트 제목 등)는 번역 대상 아님 — UI 텍스트만 다국어화가 기본 범위. 자동 번역 기능은 별도 Phase 확장 과제로 백로그에 남김
- 모듈 레지스트리(`modules.title_ko`, `modules.title_en`)처럼 관리자가 등록하는 텍스트는 로케일별 컬럼으로 관리

## 2. 인증 (Supabase Auth + Google OAuth)

**플로우**
1. Supabase 프로젝트에서 Google Provider 활성화
2. Google Cloud Console에서 OAuth 클라이언트 생성, Redirect URI를 `https://<supabase-project>.supabase.co/auth/v1/callback`로 등록
3. 프론트엔드는 Supabase JS SDK의 `signInWithOAuth({ provider: 'google' })` 사용
4. 로그인 성공 시 `profiles` 테이블에 트리거로 자동 레코드 생성 (Postgres trigger on `auth.users` insert)

**세션 관리**
- Next.js 미들웨어에서 Supabase 세션 쿠키 검증 후 보호 라우트(`/admin`, 결제 관련) 접근 제어
- 향후 이메일 로그인, 다른 소셜 Provider 추가는 이 구조에 Provider만 추가하면 됨 (초기부터 Google 단일 하드코딩 금지, Provider 목록을 설정값으로 관리)

## 3. 다크모드 / 라이트모드

- 라이브러리: `next-themes`
- 기본값: `system` (OS 설정 따름), 헤더의 토글 스위치로 `light`/`dark` 수동 전환, 선택값은 로컬스토리지 + (로그인 시) `profiles`에도 저장해 기기 간 동기화
- 테마 토큰: Tailwind `:root` / `.dark` CSS 변수로 정의, 컴포넌트는 시맨틱 클래스만 사용 (`bg-background`, `text-foreground` 등 — 원색 하드코딩 금지)
- SSR 깜빡임(FOUC) 방지: `next-themes`의 스크립트 인젝션 방식 사용

## 4. 관리자 모드

**권한 모델**
- `profiles.role`: `'user' | 'admin'` (향후 `'moderator'` 등 세분화 여지를 두고 컬럼은 `text`로 유지, 하드코딩 enum 지양)
- `/admin` 라우트 그룹은 미들웨어에서 `role === 'admin'`만 통과, RLS로도 이중 방어 (Postgres 정책에서 `role` 체크)

**핵심 어드민 화면**
1. **모듈 관리 보드**: `modules` 테이블 CRUD, `enabled`/`status`/`new_until` 토글 — 이 화면이 사실상 "Phase 배포 스위치" 역할
2. **콘텐츠 심사 큐**: 신고된 프롬프트/아티팩트 처리, Phase 3부터는 자동생성 콘텐츠 품질 게이트(애드센스 정책 위반 방지)도 여기서 처리
3. **사용자 관리**: role 변경, 정지 처리
4. **결제/정산 대시보드** (Phase 4~): revenue_shares 현황, 정산 대기 목록
5. **스모크테스트 승인**: 광고 예산 집행 승인, 리포트 검수 후 유저 공개

**설계 원칙과의 연결**
- 어드민 화면 역시 `modules` 레지스트리 기반으로 메뉴가 늘어나야 한다. Phase 5까지 감안해 어드민 사이드바도 동적 구성으로 설계 (`docs/06`의 네비게이션 원칙과 동일 패턴 재사용)

## 5. 초기 설정 체크리스트 (Claude Code 착수용)

- [ ] Next.js 프로젝트 생성, App Router + Tailwind 초기화
- [ ] Supabase 프로젝트 생성 → `.env`에 URL/anon key/service role key 분리 저장
- [ ] `next-intl` 미들웨어 + 로케일 라우팅 골격
- [ ] `next-themes` 다크/라이트 토글 컴포넌트
- [ ] Google OAuth 연동 (Supabase Auth)
- [ ] `profiles` 자동 생성 트리거
- [ ] `modules` 테이블 시드 데이터 (Phase 1 모듈 1개만 `enabled: true`로)
- [ ] `/admin` 라우트 그룹 + role 기반 미들웨어 가드
- [ ] Vercel 프로젝트 연결, Preview 배포 확인
