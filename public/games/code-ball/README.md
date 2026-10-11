# Code Ball

야구장 고양이 코치와 숫자·영문자 3~6자리 코드를 풀어요. 순차 입력·자동 비우기·추리 기록·후보 메모로 연속 도전과 오늘의 경기!

## 독립 실행
폴더 전체를 정적 서버에 복사하고 index.html을 엽니다. 상위 경로와 폴더 이름 변경 가능. Next.js·계정·API·CDN 없이 실행됩니다. Web Audio 합성 사운드, 상대 경로 이미지·모듈, 로컬 기록이 포함됩니다. HTTP(S), ES modules, Pointer Events, Web Audio를 지원하는 최신 브라우저가 필요합니다.

조작: 기호 순서대로 클릭/탭/키보드, Enter 판독, Backspace 지우기, Delete 전체 지우기, 우클릭·메모 후보 표시

## 연동 계약 v1
iframe URL의 parentOrigin에 허용 부모 origin을 지정합니다. source/origin/gameId 검증. game-ready/start/mode/paused/resumed/score/finished 이벤트, game-command의 start/restart/pause/resume/resize/dispose 지원. 점수는 gameId/roundId/score/durationMs/rankingKey를 포함하고 game-score-saved로 확인합니다. 호스트는 rankingKey별로 랭킹을 분리해야 합니다. qa=1/preview=1에서는 외부 제출을 억제합니다. window.gameModule은 lifecycle과 snapshot을 제공합니다. qa 전용 정답은 실제 플레이에서 노출하지 않습니다.

저장 키: portable-game:1:code-ball:*. 구버전 최고 기록은 별도 규칙이므로 그대로 보존하고 새 모드 기록과 합치지 않습니다. 광고와 서버는 게임 본체가 요구하지 않습니다.

## 폰트
Pretendard·Fredoka·Cinzel (SIL OFL 1.1), fonts/에 원본 서체·전체 라이선스·출처 해시 포함. 외부 폰트 요청 없음.

## 버전과 재패키징
1.1.0, runtime v1. node scripts/package-puzzle-games.cjs. exports/games의 ZIP에 실행 파일·이미지·썸네일·문서가 포함됩니다.
