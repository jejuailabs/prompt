# Neon Slope

햄스터·고양이·강아지를 골라 천천히 데굴데굴! LIFE 네 글자로 생명을 모으고 스피드 업·다운 아이템을 골라 달려요. 180m부터 점프와 좌우 경사가 있는 스테이지 2.

## 실행과 이식

이 폴더 전체를 웹 서버에 배치하고 index.html을 엽니다. 폴더 이름과 상위 경로는 바꿀 수 있습니다. 단독 실행에 Next.js, 원본 프로젝트, API, CDN, 로그인이 필요하지 않습니다. 모든 리소스는 상대 경로로 불러옵니다.

- 조작: ← → / A·D / 터치 / 드래그 = 좌우, 스테이지 2: Space / ↑ / W / 점프 버튼, Esc = 일시정지
- 실행 요구사항: WebGL 2, ES modules, HTTP(S) 정적 호스팅. 로컬 파일 더블클릭 대신 웹 서버를 사용하세요.
- 그래픽: 이 패키지의 코드로 생성한 3D 장면·캐릭터·재질. 썸네일 cover.png는 실제 실행 화면입니다.
- 소리: Web Audio로 합성하며 외부 음원에 의존하지 않습니다.
- 저장: portable-game:1:neon-slope:best / muted / pending-score. 저장소를 쓸 수 없어도 플레이는 가능합니다.
- 폰트: Pretendard·Fredoka·Cinzel, SIL OFL 1.1. fonts/의 라이선스·출처·해시를 함께 배포합니다.
- Third party: Three.js 0.172.0 (MIT), vendor/THREE-LICENSE.txt.

## 호스트 계약 v1

iframe URL에 parentOrigin=https%3A%2F%2Fyour-host.example을 지정하세요. 허용 부모 origin과 message.source를 검사합니다. 다른 프로젝트의 API 주소를 게임에 넣지 않고, 호스트가 점수 이벤트를 처리합니다.

발신: game-ready, game-start, game-paused, game-resumed, game-score, game-finished. 모든 이벤트에 gameId, contractVersion:1을 포함하며 점수에는 score, roundId, durationMs가 있습니다.

명령: {type:'game-command', gameId:'neon-slope', contractVersion:1, command:'start'|'pause'|'resume'|'restart'|'resize'|'dispose'}. 저장 확인: {type:'game-score-saved',gameId:'neon-slope',roundId}.

동일 문서에서 window.gameModule의 start/pause/resume/restart/resize/dispose/snapshot을 사용할 수 있습니다. preview=1은 외부 점수 전달과 미완료 제출 저장을 끕니다. qa=1은 같은 제출 억제 모드이며 브라우저 검증용입니다.

전체 프로젝트에서 재패키징: node scripts/package-games.cjs. 게임별 ZIP은 exports/games에 생성합니다.

## 선택형 광고 이어하기 v1

광고 없이도 기본 게임은 그대로 실행됩니다. 허용 부모가 game-ad-capabilities의 rewardedContinue:true를 보내면 생명 소진 때 한 판당 1회 이어하기를 선택할 수 있습니다. 게임의 game-continue-request에는 roundId·requestId를 포함합니다. 부모는 실제 시청 완료 뒤에만 game-reward-result의 result:rewarded를 보내며 두 ID를 그대로 대조합니다. dismissed / unavailable / failed는 보상하지 않습니다. 중복·오래된 응답은 무시합니다. 광고 중 판을 멈추며 완료 후 같은 판·점수로 생명 1개를 복구합니다. 최종 점수는 마무리 때 한 번만 전달합니다. 광고 SDK는 호스트 어댑터에서 연결하고 패키지는 특정 네트워크를 요구하지 않습니다.
