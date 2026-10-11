# Pocket Crossing

작은 입체 캐릭터로 도로·강·철도를 한 칸씩 건너세요. 차량 사이의 틈, 떠가는 통나무와 기차 경고를 읽고 독수리가 오기 전에 다음 칸으로 나아갑니다.

## 실행과 이식

이 폴더 전체를 웹 서버에 배치하고 index.html을 엽니다. 폴더 이름과 상위 경로는 바꿀 수 있습니다. 단독 실행에 Next.js, 원본 프로젝트, API, CDN, 로그인이 필요하지 않습니다. 모든 리소스는 상대 경로로 불러옵니다.

- 조작: 방향키/WASD/터치 방향 버튼 = 이동, 탭 = 앞으로, 스와이프 = 네 방향, Esc = 일시정지
- 실행 요구사항: WebGL 2, ES modules, HTTP(S) 정적 호스팅. 로컬 파일 더블클릭 대신 웹 서버를 사용하세요.
- 그래픽: 이 패키지의 코드로 생성한 3D 장면·캐릭터·재질. 썸네일 cover.png는 실제 실행 화면입니다.
- 소리: Web Audio로 합성하며 외부 음원에 의존하지 않습니다.
- 저장: portable-game:1:pocket-crossing:best / muted / pending-score. 저장소를 쓸 수 없어도 플레이는 가능합니다.
- Third party: Three.js 0.172.0 (MIT), vendor/THREE-LICENSE.txt.

## 호스트 계약 v1

iframe URL에 parentOrigin=https%3A%2F%2Fyour-host.example을 지정하세요. 허용 부모 origin과 message.source를 검사합니다. 다른 프로젝트의 API 주소를 게임에 넣지 않고, 호스트가 점수 이벤트를 처리합니다.

발신: game-ready, game-start, game-paused, game-resumed, game-score, game-finished. 모든 이벤트에 gameId, contractVersion:1을 포함하며 점수에는 score, roundId, durationMs가 있습니다.

명령: {type:'game-command', gameId:'pocket-crossing', contractVersion:1, command:'start'|'pause'|'resume'|'restart'|'resize'|'dispose'}. 저장 확인: {type:'game-score-saved',gameId:'pocket-crossing',roundId}.

동일 문서에서 window.gameModule의 start/pause/resume/restart/resize/dispose/snapshot을 사용할 수 있습니다. preview=1은 외부 점수 전달과 미완료 제출 저장을 끕니다. qa=1은 같은 제출 억제 모드이며 브라우저 검증용입니다.

전체 프로젝트에서 재패키징: node scripts/package-games.cjs. 게임별 ZIP은 exports/games에 생성합니다.
