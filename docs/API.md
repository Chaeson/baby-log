# API v1

모든 시간은 ISO-8601 UTC 문자열입니다. ID는 UUID입니다.

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/v1/families` | Family 생성 |
| POST | `/api/v1/families/{familyId}/children` | Child 등록 |
| GET | `/api/v1/families/{familyId}/children` | Child 목록 |
| POST | `/api/v1/events/feedings` | 분유 기록 |
| POST | `/api/v1/events/diapers` | 기저귀 기록 |
| POST | `/api/v1/events/sleeps/start` | 수면 시작 |
| POST | `/api/v1/events/sleeps/{sleepId}/end` | 수면 종료 |
| GET | `/api/v1/families/{familyId}/dashboard/today?zoneId=Asia/Seoul` | 오늘 아이별 집계 |
| POST | `/api/v1/voice/transcriptions` | 브라우저 녹음 음성 인식 |

## Feeding

```json
{
  "childId": "00000000-0000-0000-0000-000000000000",
  "amountMl": 120,
  "occurredAt": "2026-08-31T05:20:00Z",
  "memo": null,
  "createdByUserId": null
}
```

`occurredAt`을 생략하면 서버 현재 시각을 사용합니다. `amountMl`은 1~2000 범위입니다.

## Diaper

`diaperType`은 `PEE`, `POOP`, `BOTH` 중 하나입니다.

## Sleep

시작 요청의 `startedAt`과 종료 요청의 `endedAt`을 생략하면 서버 현재 시각을 사용합니다. 열린 수면 기록만 종료할 수 있고 종료 시각은 시작 시각보다 빠를 수 없습니다.

## Voice transcription

`multipart/form-data`의 `audio` part로 녹음 파일을 전송합니다.

```bash
curl -F 'audio=@voice.webm;type=audio/webm' \
  http://127.0.0.1:8080/api/v1/voice/transcriptions
```

브라우저 녹음을 위해 `webm`, `mp4`, `ogg`, `mpeg`, `wav` 계열을 허용하며 최대 크기는 10MB입니다.

```json
{
  "text": "첫째 분유 120 먹었어",
  "model": "gpt-4o-mini-transcribe"
}
```

이 API는 transcription만 수행하고 BabyEvent를 생성하지 않습니다. 구조화 결과를 보여주고 사용자가 확인한 뒤 Event를 저장하는 API는 다음 단계입니다. `OPENAI_API_KEY`가 없으면 503, OpenAI 호출 실패는 502를 반환합니다.

## Today dashboard current state

오늘 Dashboard 응답은 기존 일일 합계와 함께 응답 생성 시각인 `generatedAt`과 아이별 `currentState`를 반환합니다.

- `lastFeeding`: 오늘 범위와 관계없이 가장 최근 분유의 시각과 용량
- `lastPeeAt`, `lastPoopAt`: 가장 최근 기저귀 기록 시각. `BOTH`는 두 항목에 모두 포함
- `sleep.status`: `SLEEPING` 또는 `AWAKE`
- `sleep.since`: 수면 중이면 현재 수면 시작, 깨어있으면 최근 수면 종료 시각

수면 기록이 아직 없으면 `AWAKE`이면서 `since`는 `null`입니다. 미래 시각으로 입력된 이벤트는 현재 상태 계산에서 제외합니다.

## 오류

오류는 RFC 9457 Problem Details 형식으로 반환합니다. 검증 오류는 400, 존재하지 않는 리소스는 404, 현재 상태와 충돌하는 요청은 409, 외부 서비스 설정/장애는 503/502입니다.
