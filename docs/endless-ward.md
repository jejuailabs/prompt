# 끝없는 병원 1.0.0 — Godot 독립 게임

`public/games/endless-ward/` 전체가 독립 정적 모듈이다. `src/lib/godot-games.ts`를 기존 게임룸 레지스트리에 합쳐 카드와 `builtin-endless-ward` 조회를 제공한다. 기존 Three.js 패키저는 engine=godot을 제외하여 index.html을 보존한다.

로컬 실행: `/games/endless-ward/index.html`, 게임룸: `/app#game-play?id=builtin-endless-ward`. WASM MIME을 명시하며 정적 파일은 인증 미들웨어를 호출하지 않는다. API·DB·서버 실행은 게임 자체의 요구사항이 아니다.

1920×1080, 한글 Pretendard 포함, 응급병동 180초 → 격리병동 180초/엘리트 → 수술동 보스. 이동만 직접 조작하고 자동 공격한다. 키보드와 터치 이동 패드, 시작/일시정지/소리/전체화면을 지원한다.

호스트 계약 v1은 manifest/README를 따른다. 부모 origin·message.source·gameId·버전을 검사한다. 실제 API 주소와 로그인은 게임에 포함하지 않는다. 점수는 처치×100 + 클리어 병동×10000 + 완주 시 max(0,900-floor(전체 플레이 초))×10. 종료당 한 번 제출하며 roundId로 저장 확인을 대조한다. preview=1/qa=1에서는 점수를 게시하거나 미제출 저장하지 않는다.

소스: `C:/Users/na/Desktop/vibeproject/godot/261023`. 재빌드 `build-all.cmd`, 갱신 `python tools/integrate-prompt.py`. 이미지·효과음·사용자 제공 MP3는 PCK 안에 있다. 라이선스는 licenses/를 포함한다. MP3의 공개 배포 권한 문서는 제공되지 않았으므로 공개 업로드 전 확인 대상이다.

공개 호스팅 업로드, 유료 API, 실제 DB 점수 쓰기는 실행하지 않았다. 배포 시 계정별 저장·대역폭·빌드 한도와 초과 과금을 확인하고 비용이 발생하거나 불확실하면 구체적인 승인을 받아야 한다.

검증 완료: 게임 발견·기존 게임 회귀 14개, TypeScript noEmit, 대상 ESLint, 모듈 17개 파일 및 전체 SHA-256, 패키저 Godot 제외/기존 Three.js 유지 통과. 실제 브라우저에서 카드→실행→정보창 복귀→닫기→재열기와 390px 이동 패드 입력을 확인했다. iPhone/Android 실기기·Firefox·운영 DB 쓰기·공개 업로드는 검증 범위에 포함하지 않는다.
