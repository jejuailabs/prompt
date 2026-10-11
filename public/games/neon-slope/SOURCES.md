# Neon Slope — 제작 출처

게임 규칙을 검토할 때 참고한 공개 플레이 페이지:

- Tower Rush: https://play.famobi.com/tower-rush
- Slope: https://ko.y8.com/games/slope
- Crossy Road: https://poki.com/kr/g/crossy-road

게임 코드, 캐릭터, 블록, 차량, 도시, 자연물, 재질 및 합성 효과음은 이 프로젝트에서 제작했습니다. 원본 게임의 코드나 이미지를 포함하지 않습니다. 실제 렌더러 의존성은 Three.js 0.172.0이며 MIT 라이선스를 vendor/THREE-LICENSE.txt에 포함했습니다. cover.png는 이 게임의 실제 플레이를 Chromium에서 캡처한 화면입니다.

1.1.0: 햄스터·버섯·마시멜로·캔디 나무 모델은 art.mjs의 자체 3D 코드다. 스테이지 2 코스·점프·좌우 경사도 프로젝트에서 제작했다. cover.png는 새 스테이지 2의 실제 화면이다.

1.2.0: 햄스터·고양이·강아지와 LIFE·속도 아이템은 art.mjs의 자체 3D 도형이다. items.mjs의 생명·수집·속도 규칙도 패키지에 포함하며 외부 모델·텍스처·폰트를 요구하지 않는다. cover.png는 새 HUD가 있는 실제 햄스터 플레이 화면이다.

1.3.0: continuation.mjs의 선택형 광고 완료/취소·복귀 계약도 자체 코드이며 패키지에 포함한다. 광고 SDK나 외부 네트워크는 단독 게임 실행에 필요하지 않고 실제 송출 공급자는 호스트에서 교체한다.
