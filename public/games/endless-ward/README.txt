ENDLESS WARD / 끝없는 병원 1.0.0 — portable Web

폴더 전체를 HTTP(S) 정적 서버에 올리고 index.html을 여세요.
HTML 파일 더블클릭(file://) 실행은 지원하지 않습니다.
파일 이름과 상대 구조를 유지하면 폴더명·상위 경로는 바꿀 수 있습니다.
WebAssembly + WebGL 2 필요. 단일 스레드이므로 SharedArrayBuffer/COOP/COEP가 필요 없습니다.
wasm MIME: application/wasm. 외부 CDN·API·로그인 없이 플레이합니다.

WASD / 방향키 이동, 모바일은 이동 패드 드래그. 공격·조준 자동.
상단 시작·계속·일시정지·소리·전체화면 버튼. 모바일 가로 화면 권장.
응급병동 3분 → 격리병동 3분(엘리트) → 수술동 중간 보스.
점수: 처치×100 + 클리어 병동×10000 + 완주 시 max(0,900-전체 초)×10.

iframe src=".../index.html?embed=1&parentOrigin=https%3A%2F%2Fyour-host.example"
호스트 계약 v1: game.manifest.json. window.gameModule start/pause/resume/restart/resize/dispose/snapshot.
game-command는 지정 부모 origin과 message.source 및 gameId/contractVersion을 검사합니다.
종료 시 game-score(score,roundId,durationMs)와 game-finished가 발행됩니다.
game-score-saved에 roundId를 돌려주면 미제출 기록이 삭제됩니다.
preview=1 / qa=1은 호스트 점수 발행·미제출 저장을 억제합니다.
로그인/서버 랭킹은 호스트가 연결하며 이 게임에는 API 주소·계정 키가 없습니다.
음악 공개 재배포 권한은 licenses/ASSET-NOTICES.txt를 확인하세요.
