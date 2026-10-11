# 게임 서체 적용 — 2026-10-11

기본 시스템 글꼴·Arial·Georgia가 섞여 있던 게임들을 장르별 제목과 공통 한글 UI로 정리했다.

| 쓰임 | 선택 | 이유 |
|---|---|---|
| 귀여운 게임의 영문 제목 | Fredoka variable 300–700 | 둥근 획과 넓은 형태가 캐릭터·촉감 타일과 어울린다. |
| 블랙잭 영문 제목·코트 카드 | Cinzel variable 400–900 | 고전적인 로마자 비례가 황동·펠트 테이블과 어울린다. |
| 한글·설명·버튼·점수·숫자 입력 | Pretendard Variable 100–900 | 작은 화면에서도 안내와 비슷한 숫자를 쉽게 읽도록 한다. 점수에는 tabular-nums를 적용한다. |

Fredoka와 Cinzel은 한글을 지원하지 않으므로 한글 제목은 Pretendard로 대체한다. 한글을 지원하는 것처럼 표기하지 않는다.

공식 출처:
- [Fredoka 설명](https://github.com/google/fonts/blob/main/ofl/fredoka/DESCRIPTION.en_us.html)
- [Cinzel 설명](https://github.com/google/fonts/blob/main/ofl/cinzel/DESCRIPTION.en_us.html)
- [Pretendard 프로젝트](https://github.com/orioncactus/pretendard)
- [Pretendard 라이선스](https://github.com/orioncactus/pretendard/blob/main/LICENSE)

## 파일과 패키징

public/games/fonts/에 변경하지 않은 원본 서체와 SIL OFL 1.1 라이선스 전문을 보관한다. sources.json에 다운로드 시점·출처 URL·바이트 크기·SHA-256을 기록한다. Google Fonts 런타임 요청은 제거했다. public/games/little-worlds/shared.css의 외부 폰트 의존도 로컬 서체로 바꿨다.

scripts/game-fonts/package.cjs가 DOM/3D 패키지 각각에 fonts/를 복사한다. 게임별 매니페스트의 files·assets·dependencies에 서체와 라이선스를 포함한다. 단독 실행에서 공통 /games/fonts 경로를 요구하지 않는다. 기존 단일 HTML들은 ./fonts/game-fonts.css로 공통 로컬 서체를 사용한다. 기존 HTML의 독립 패키징은 점진적 전환 대상이며 이번 서체 변경만으로 모두 완성되었다고 취급하지 않는다.

## 확인

scripts/game-fonts/browser-qa.cjs에서 10개 독립 패키지의 실제 FontFace loaded 상태와 제목/본문 font-family, 기존 HTML 22개(허브·템플릿 포함), 별도 프로젝트의 변경된 경로에서 로컬 서체 로딩을 확인했다. 네 퍼즐 게임의 데스크톱·모바일·가로 화면과 이식 계약은 기존 브라우저 검증에도 통과했다. 이미지·게임 물리·입력 판정과 점수 규칙은 서체 선택에 맞춰 변경하지 않았다.
