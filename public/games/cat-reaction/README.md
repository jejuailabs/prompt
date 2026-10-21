# 번개 냥이 반응속도 / Lightning Paws

초록색으로 바뀌고 냥이가 깨어나는 순간 톡! 기본·가짜 신호·연속 반응 3단계 평균으로 최고 반응속도(ms)에 도전해요.

## 실행

폴더 전체를 정적 HTTP(S) 서버에 복사하고 `index.html`을 엽니다. 외부 서버·CDN·로그인 없이 3단계 플레이, 결과, 일시정지·재개·재시작, 기기 최고 기록을 지원합니다. 모든 경로는 상대 경로라 다른 프로젝트의 하위 경로(예: `/mini-games/cat-reaction/`)에서도 그대로 동작합니다.

조작: 초록색이 되면 화면 터치 / 클릭 / 스페이스, Esc = 일시정지

## 규칙

| 단계 | 시도 | 대기 | 특징 |
|---|---|---|---|
| 1 낮잠 냥이 | 3 | 1.5~3.8초 | 기본. 초록색이 되면 터치 |
| 2 장난꾸러기 냥이 | 3 | 2.2~4.6초 | 노랑·하늘·청록 색 함정과 헤엄치는 물고기 가짜 신호 1~2회 |
| 3 번개 냥이 | 5 연속 | 0.55~2.1초 | 쉬지 않고 이어지는 짧고 불규칙한 대기, 가짜 신호 0~1회 |

- 단계 평균 = 그 단계 시도의 평균. 종합 기록 = 세 단계 평균의 평균 + 실수 1회당 20ms.
- 초록 전 터치, 가짜 신호 터치, 신호 후 100ms 미만 터치는 실수(예측)로 처리하고 같은 시도를 다시 합니다.
- 신호 후 1초(3단계 0.9초) 안에 누르지 않으면 1000ms로 기록합니다.
- 일시정지·창 전환 시 진행 중 시도는 버리고 다시 시작합니다.
- 반응 시간은 초록 화면을 그리는 프레임에서 잰 시각과 입력 이벤트의 `timeStamp` 차이입니다. 스크립트로 만든(`isTrusted=false`) 입력은 무시합니다.

## 캐릭터

냥이 클럽의 3D 식빵 냥이 모델(cats.mjs·breeds.mjs)을 그대로 쓰고, 이 게임용 표정 세 가지(졸림·집중·어지러움)를 추가했습니다. 단계마다 치즈 냥이 → 샴 → 메인쿤으로 바뀌고, 대기(졸림·Zzz) / 준비(집중) / 지금!(놀람·점프·번개) / 너무 빨라요(어지러움·흔들림·땀방울) / 결과(속도별 표정) / 완료(축하) 연출이 있습니다.

## 호스트 계약 v1

`parentOrigin` 쿼리와 부모 source/origin/gameId를 검사합니다. 이벤트: game-ready, game-mode, game-start, game-paused, game-resumed, game-score, game-finished. 명령: start, pause, resume, restart, resize, dispose. game-score-saved를 받으면 보관 중인 기록을 지웁니다.

`game-score`는 `score = 100000000 - 종합ms`(높을수록 빠름), `roundId`, `durationMs`, `rankingKey: "reaction-total"`, `reactionMs`, `proof: {trials[11], falseStarts}`를 보냅니다. 호스트 서버는 proof로 점수를 다시 계산하고 범위(100~1000ms), 기계적으로 일정한 기록, 130ms 미만 과다, 최소 진행 시간을 검사합니다. 기준을 벗어난 기록은 기기에만 저장되고 전송하지 않습니다. `qa=1`/`preview=1`에서는 서버 제출을 하지 않습니다.

`window.gameModule`은 lifecycle과 `snapshot()`을 제공합니다. 종료 시 타이머·입력·오디오·관찰자·GPU 자원을 해제합니다.

## 파일과 출처

Three.js 0.172.0(MIT), Pretendard·Fredoka·Cinzel(OFL-1.1) 폰트 파일과 라이선스를 포함합니다. 효과음은 Web Audio 합성이며 외부 음원이 없습니다. 썸네일 cover.png는 실제 플레이 화면 캡처입니다.

재패키징: `node scripts/package-cat-reaction.mjs` · 브라우저 QA: `node scripts/game-module-kit/serve.cjs public 4175` 실행 후 `node scripts/game-module-kit/cat-reaction.mjs`
