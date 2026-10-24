# AI 일정 일일 자동 수집 (event-ingest)

백엔드 전용 모듈(화면·메뉴 없음, 그래서 `module.config.ts` 없음). 결과는 기존 **AI 일정**(`ai-events`)에 `published`로 올라가고 홈의 일정/이벤트 카드에 그대로 나온다.

## 흐름
`sources.ts` 소스 → `adapters.ts` 새 링크 수집 → 원장(ledger)으로 이미 본 링크 제거 → 상세 페이지 읽기(robots.txt 확인) → `extract.ts` AI가 우리 말로 재작성(AI·디지털 무관/종료/채용 등은 탈락) → `poster.ts` 원본 포스터가 있으면 변환해 업로드 → Artifact 생성.

- 원장: `Artifact(sourceModule='event-ingest', title=링크 해시)`. 처리한 링크는 결과(published/irrelevant/ended/…)와 함께 기억해 다시 AI를 부르지 않는다. 일시 오류는 3회까지 재시도.
- 교차 중복: 최근 120일 게시 제목과 정규화 비교(잇지제주가 제주TP 공고를 다시 올린 경우 등).
- 비용 상한: 실행당 AI 호출 `INGEST_MAX_AI`(기본 40), 소스별 새 링크 상한(`sources.ts`의 `max`). 모든 AI 공급자가 크레딧 소진/키 오류면 그 실행을 즉시 멈추고 원장에 쓰지 않는다.

## 실행
- 매일 06:00 KST: `vercel.json` 크론이 `GET /api/cron/event-ingest` 호출 (`CRON_SECRET` 필요).
- 관리자 즉시 실행: `POST /api/cron/event-ingest` `{ "dryRun": false, "sources": ["idge"], "maxAi": 10 }` — **`dryRun`을 생략하면 미리보기(쓰기 없음)**.
- 로컬 미리보기(쓰기 없음): `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/event-ingest-dry-run.ts idge,ofjeju 4`

## 소스 점검 기록 (2026-10-24)
수집: 잇지제주(RSS), 제주콘텐츠진흥원, 제주청년센터, 제주한라대 RISE(공지), 제주RISE센터(공지). 키가 있으면: 네이버 뉴스 검색, K-Startup, 기업마당.
수집하지 않음: jeju.go.kr · jejutp.or.kr · jejunu.ac.kr (robots.txt가 전체 차단), hi.chu.ac.kr (방화벽), jejuventure.or.kr (https 미지원이라 https 링크 규칙에 못 맞음), onoffmix · festa.io (전체 차단). 이 기관들은 잇지제주·네이버 뉴스 검색·뉴스레터로 우회한다.
K-Startup/기업마당 응답 필드명은 문서만 보고 맞춘 것이라 **실제 키로 한 번 확인이 필요**하다.

## 저작권 원칙
제목·일정 같은 사실 정보와 출처 링크만 가져오고, 소개 글은 AI가 새로 쓴다. 포스터는 공지에 원본이 있을 때만 재사용(없으면 기존 텍스트 포스터).
