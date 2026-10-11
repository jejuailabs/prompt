# 냥이 뒤집기 / Loaf Flip

꾹 누르고 놓으면 식빵 냥이가 빙글! 네 발로 쿠션에 착지해요. 공중에서 탭하면 회전이 줄어들어요. 높아지는 단계와 7종 친구들로 한 번 더 도전!

## 실행

폴더 전체를 정적 HTTP(S) 서버에 복사하고 index.html을 엽니다. 외부 서버·CDN·로그인 없이 플레이, 점수, 일시정지·재개·재시작·기기 최고 기록을 지원합니다. 상대 경로이며 다른 프로젝트의 하위 경로로 이식 가능합니다.

조작: 누르고 놓기 = 점프·회전, 공중 탭 = 회전 줄이기, 스페이스 / Esc 지원

## 캐릭터와 속도

7종은 귀·얼굴·무늬·털·꼬리가 다른 자체 3D 모델이며 실제 렌더링 PNG를 함께 포함합니다. 능력은 동일하고 시작·일시정지·결과 패널에서 친구를 선택할 수 있습니다. 한 판의 단계에 따라 기본 템포가 올라가며 사용자 배율은 1–2배, 기본 미만은 허용하지 않습니다. 새 판에서는 단계가 초기화되고 배율·선택 친구는 유지합니다.

## 호스트 계약 v1

parentOrigin과 부모 source/origin/gameId를 검사합니다. game-ready/start/paused/resumed/score/finished, game-command의 start/pause/resume/restart/resize/dispose, game-score-saved를 지원합니다. 점수는 score/roundId/durationMs를 포함합니다. qa=1/preview=1에서는 서버 제출을 억제합니다. window.gameModule의 lifecycle/snapshot을 제공합니다. 종료 시 GPU·입력·오디오·관찰자를 해제합니다.

## 파일과 출처

Three.js 0.172.0 MIT 엔진·라이선스, 캐릭터 코드·7종 PNG·실제 썸네일을 포함합니다. 외부 음원 없이 Web Audio를 합성합니다. 샘플 1.1.0. 재패키징: node scripts/package-cat-games.cjs
