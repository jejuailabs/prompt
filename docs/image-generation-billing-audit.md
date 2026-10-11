# 이미지 생성 비용 확인 — 2026-10-11

## 내장 ImageGen과 API

내장 ImageGen은 Codex 포함 사용량에 포함되고 한도를 소진한 뒤에는 구매한 크레딧을 사용할 수 있다. 프로젝트의 OpenAI API 키를 호출하는 방식과 과금 경로가 다르다. 처음 생성한 숨은 고양이 배경 3장과 딜러 1장은 내장 도구였다. 결과에는 개별 usage·청구서 금액이 반환되지 않았다. 그 네 장을 API 표준 단가로 계산해 실제 청구로 취급하지 않는다.

[공식 Codex 가격 설명](https://learn.chatgpt.com/docs/pricing), [내장 이미지 생성](https://learn.chatgpt.com/docs/image-generation).

조회 시 계정 전체 주간 사용률은 6%, 구매한 추가 크레딧 잔액은 0이었다. 이는 이미지 4장만의 사용률이 아니다. 한도 이후 자동으로 프로젝트 API 키에서 별도 이미지 청구를 발생시키는 것으로 확인하지 않았다.

사용자 지시로 이후 야구 고양이 1장은 프로젝트에 설정된 OPENAI_API_KEY로 생성했다. 이 요청은 별도 API 사용료 대상이다. 일반 프로젝트 키로 모델 접근은 성공했지만 조직 costs와 images usage 조회는 403이었다. 관리자 키가 없어서 공급자 청구서를 직접 확인하지 못했다. 키는 출력·파일 기록하지 않았다.

## 이번 API 이미지 1장

- 모델: gpt-image-2
- 품질/크기: high, 1536×1024
- 텍스트 입력: 171토큰; 이미지 입력: 0토큰
- 이미지 출력: 5,488토큰
- 표준 단가: 텍스트 입력 $5/백만, 이미지 입력 $8/백만, 이미지 출력 $30/백만
- 계산: (171×5 + 5,488×30) / 1,000,000 = **$0.165495**
- 근거: [OpenAI API 가격](https://developers.openai.com/api/docs/pricing)
- 결과: public/games/code-ball/assets/club.webp
- 응답 사용량·요청 ID·프롬프트·계산 근거: output/imagegen/code-ball-hero.receipt.json (비공개 로컬 기록)

이는 API 응답 토큰과 표준 단가의 계산 비용이다. 공급자가 반환하지 않은 청구서 총액·세금·할인·환율을 포함한 카드 결제액이라고 표기하지 않는다. Batch 단가는 이번 일반 Images API 호출에 사용하지 않았다.

## 프로젝트의 기존 ‘imagen’ 기록

기존 provider ID imagen-4-fast/standard/ultra는 실제 실행 매핑에서 Gemini 이미지 모델을 호출한다. ID 이름만으로 Google Imagen 청구로 해석하면 안 된다. fast는 gemini-2.5-flash-image, 나머지도 각 Gemini 모델로 매핑한다. ModelProvider.costPerUnit과 GenerationJob.costActual은 현재 설정된 고정 단가를 기록하는 경로이며, 공급자 원문 usage를 보존한 청구 실측 값이 아니다. 예를 들어 fast 완료 1건에는 설정 단가 28과 내부 차감 크레딧 39가 기록되어 있다. 실패 작업의 차감 필드만 합산해 순차감을 계산하지 않는다. 환불 지갑 기록은 별개다.

## 재사용 계측 도구

scripts/image-api/generate.cjs가 서버 환경 파일을 읽어 키를 자식 프로세스 환경으로만 전달한다. cli-meter.py는 번들 ImageGen CLI를 수정하지 않고 generate 호출의 실제 응답을 기록한다. 장당 측정을 위해 n=1, gpt-image-2로 제한하며 자동 재시도를 끈다. 실패 응답의 원문·키·base64 이미지 데이터를 로그에 출력하지 않는다.

```
node scripts/image-api/generate.cjs --receipt output/imagegen/example.receipt.json generate --model gpt-image-2 --quality high --size 1536x1024 --prompt-file output/imagegen/example-prompt.txt --out output/imagegen/example.png
```

현재 계측은 generate 1장 경로에 한정한다. edit·batch·다른 모델은 각 요율과 응답 usage를 검증한 뒤 확장한다. 새 요청의 금액은 실제 응답 토큰에 따라 달라진다.
