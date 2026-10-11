# Prism Stack

7종 식빵 고양이를 높이에 따라 만나며 쌓는 3D 타이밍 게임. 기본 속도는 층수에 따라 올라가고 사용자 배율은 1–2배만 허용합니다. 한 판이 끝나면 냥이들이 다 함께 즐거운 다이빙!

## 실행과 이식

이 폴더 전체를 웹 서버에 배치하고 index.html을 엽니다. 폴더 이름과 상위 경로는 바꿀 수 있습니다. 단독 실행에 Next.js, 원본 프로젝트, API, CDN, 로그인이 필요하지 않습니다. 모든 리소스는 상대 경로로 불러옵니다.

- 조작: 탭/클릭/스페이스 = 놓기, 속도 1–2배, Esc = 일시정지
- 실행 요구사항: WebGL 2, ES modules, HTTP(S) 정적 호스팅. 로컬 파일 더블클릭 대신 웹 서버를 사용하세요.
- 그래픽: 이 패키지의 코드로 생성한 3D 장면·캐릭터·재질. 썸네일 cover.png는 실제 실행 화면입니다.
- 소리: Web Audio로 합성하며 외부 음원에 의존하지 않습니다.
- 저장: portable-game:1:prism-stack:best / muted / pending-score. 저장소를 쓸 수 없어도 플레이는 가능합니다.
- 폰트: Pretendard·Fredoka·Cinzel, SIL OFL 1.1. fonts/의 라이선스·출처·해시를 함께 배포합니다.
- Third party: Three.js 0.172.0 (MIT), vendor/THREE-LICENSE.txt.

## 호스트 계약 v1

iframe URL에 parentOrigin=https%3A%2F%2Fyour-host.example을 지정하세요. 허용 부모 origin과 message.source를 검사합니다. 다른 프로젝트의 API 주소를 게임에 넣지 않고, 호스트가 점수 이벤트를 처리합니다.

발신: game-ready, game-start, game-paused, game-resumed, game-score, game-finished. 모든 이벤트에 gameId, contractVersion:1을 포함하며 점수에는 score, roundId, durationMs가 있습니다.

명령: {type:'game-command', gameId:'prism-stack', contractVersion:1, command:'start'|'pause'|'resume'|'restart'|'resize'|'dispose'}. 저장 확인: {type:'game-score-saved',gameId:'prism-stack',roundId}.

동일 문서에서 window.gameModule의 start/pause/resume/restart/resize/dispose/snapshot을 사용할 수 있습니다. preview=1은 외부 점수 전달과 미완료 제출 저장을 끕니다. qa=1은 같은 제출 억제 모드이며 브라우저 검증용입니다.

전체 프로젝트에서 재패키징: node scripts/package-games.cjs. 게임별 ZIP은 exports/games에 생성합니다.

## 1.3.0 일곱 품종과 속도 조절

기본 단모(1층), 아메리칸 쇼트헤어(5층), 브리티시 쇼트헤어(10층), 샴(15층), 페르시안(20층), 랙돌(25층), 메인쿤(30층)을 귀·눈·얼굴·무늬·털·꼬리로 구별합니다. breeds.html에서 실제 3D 캐릭터 이미지와 새 샘플을 확인할 수 있습니다. 기본 이동 속도는 2 + min(2.5, 층수 × 0.07)이며 사용자 배율은 1–2배입니다. 저장값·범위 입력도 1배 이상으로 정규화하고 현재 층수의 기본 속도에 곱합니다. 새 판에서는 층수가 초기화되고 배율은 유지합니다.

## 1.3.1 기본 네 색상과 품종 혼합

첫 네 마리는 치즈·크림·회색·턱시도를 각각 한 번씩 섞어서 보여줍니다. 추가 품종은 5·10·15·20·25·30층에서 하나씩 해금되며 해당 층에 첫 등장이 보장됩니다. 이후에는 기존 네 색상과 해금된 모든 친구가 같은 등장 목록에 섞여 나옵니다. 같은 외형의 연속 등장을 피하며 잘린 몸통·조각에도 원래 색과 품종을 유지합니다. 재패키징: node scripts/package-cat-games.cjs.
