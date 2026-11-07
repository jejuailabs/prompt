# 깃허브 픽 (github-pick)

유튜브 화이트리스트 채널이 소개한 깃허브 저장소를 매일 몇 개씩 골라, 무엇인지·어디에 쓰는지를 쉬운 한국어 카드로 올린다.

## 흐름
`channels.ts` 채널 RSS(쇼츠 포함, 키 불필요) → 영상 설명의 `github.com/owner/repo` 링크 → 원장으로 이미 다룬 저장소 제거 → GitHub API로 별·라이선스·업데이트 확인(품질 필터) → 점수(소개 채널 수 > 한국어 채널 > 별 > 최근성) → README + SocialKit 자막 → `write.ts` AI 카드 → `github-pick` 텍스트 아티팩트로 게시.

- 원장: `Artifact(sourceModule='github-pick-ingest', title=owner/repo 소문자)`. published/rejected는 다시 보지 않고, error는 3회까지 재시도.
- 비용 상한: 하루 게시 `GITHUB_PICK_PER_DAY`(기본 3), AI 호출은 그 3배까지. 모든 AI 공급자가 크레딧 소진이면 즉시 중단.
- SocialKit 채널 목록 API는 쇼츠를 못 가져오므로 영상 찾기는 RSS, 자막은 SocialKit(CLAUDE.md 원칙 유지).

## 실행
- 매일 07:30 KST: `vercel.json` 크론 → `GET /api/cron/github-pick` (`CRON_SECRET`).
- 관리자 즉시 실행: `POST /api/cron/github-pick` `{ "dryRun": false, "perDay": 3 }` — `dryRun` 생략 시 미리보기(쓰기 없음).
- 로컬 미리보기: `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/github-pick-dry-run.ts 3` (두 번째 인자 `live`면 실제 게시).

## 저작권
README·영상 설명을 옮기지 않고 AI가 새로 쓴 요약 + 저장소·원본 영상 링크만 싣는다. 썸네일은 GitHub 공개 미리보기 이미지(opengraph.githubassets.com).
