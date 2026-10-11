# 냥이 상자 포장 / Pocket Purrs

모양이 다른 고양이들을 돌려 상자 안에 딱 맞게 포장해요. 모든 친구를 넣으면 새 상자로! 시간이 끝나기 전에 최대한 많이 완성해보세요.

## 실행

폴더 전체를 정적 HTTP(S) 서버에 복사하고 index.html을 엽니다. 외부 서버·CDN·로그인 없이 플레이, 점수, 일시정지·재개·재시작·기기 최고 기록을 지원합니다. 상대 경로이며 다른 프로젝트의 하위 경로로 이식 가능합니다.

조작: 드래그 = 배치, 회전 버튼 / R = 회전, 번호·방향키·Enter = 키보드 배치

## 캐릭터와 속도

7종은 귀·얼굴·무늬·털·꼬리가 다른 자체 3D 모델이며 실제 렌더링 PNG를 함께 포함합니다. 능력은 동일하고 시작·일시정지·결과 패널에서 친구를 선택할 수 있습니다. 한 판의 단계에 따라 기본 템포가 올라가며 사용자 배율은 1–2배, 기본 미만은 허용하지 않습니다. 새 판에서는 단계가 초기화되고 배율·선택 친구는 유지합니다.

## 호스트 계약 v1

parentOrigin과 부모 source/origin/gameId를 검사합니다. game-ready/start/paused/resumed/score/finished, game-command의 start/pause/resume/restart/resize/dispose, game-score-saved를 지원합니다. 점수는 score/roundId/durationMs를 포함합니다. qa=1/preview=1에서는 서버 제출을 억제합니다. window.gameModule의 lifecycle/snapshot을 제공합니다. 종료 시 GPU·입력·오디오·관찰자를 해제합니다.

## 파일과 출처

Three.js 0.172.0 MIT 엔진·라이선스, 캐릭터 코드·7종 PNG·실제 썸네일을 포함합니다. 외부 음원 없이 Web Audio를 합성합니다. 샘플 1.0.0. 재패키징: node scripts/package-cat-games.cjs
