# API v1

모든 시간은 ISO-8601 UTC 문자열입니다. ID는 UUID입니다.

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/v1/families` | Family 생성 |
| POST | `/api/v1/families/setup` | 가족과 아이 1~8명을 하나의 트랜잭션으로 등록 |
| GET | `/api/v1/families/{familyId}` | Family 조회 |
| POST | `/api/v1/families/{familyId}/children` | Child 등록 |
| GET | `/api/v1/families/{familyId}/children` | Child 목록 |
| POST | `/api/v1/events/feedings` | 분유 기록 |
| POST | `/api/v1/events/diapers` | 기저귀 기록 |
| POST | `/api/v1/events/sleeps/start` | 수면 시작 |
| POST | `/api/v1/events/sleeps/{sleepId}/end` | 수면 종료 |
| GET | `/api/v1/families/{familyId}/events` | 날짜 범위별 통합 기록 Timeline |
| GET | `/api/v1/families/{familyId}/dashboard/today?zoneId=Asia/Seoul` | 오늘 아이별 집계 |
| GET | `/api/v1/families/{familyId}/insights?days=7&zoneId=Asia/Seoul` | 일별 통계와 아이별 비교 |
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

## Family setup

```json
{
  "name": "우리 가족",
  "children": [
    {"name": "첫째", "birthOrder": 1},
    {"name": "둘째", "birthOrder": 2}
  ]
}
```

응답은 `{ "family": { "id": "...", "name": "...", "createdAt": "..." }, "children": [...] }`입니다.
이름은 공백만 입력할 수 없고 최대 100자입니다. 아이 순서는 가족 안에서 중복할 수 없으며 등록 실패 시 가족/아이 모두 롤백합니다.
현재 가족 ID는 조회 대상 식별자일 뿐 인증 수단이 아닙니다. 공개 서비스 전에는 사용자 인증과 가족 구성원 권한 검사가 필요합니다.

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
- `sleep.eventId`: 현재 수면 종료 API에 전달할 ID. 깨어있으면 `null`

수면 기록이 아직 없으면 `AWAKE`이면서 `since`는 `null`입니다. 미래 시각으로 입력된 이벤트는 현재 상태 계산에서 제외합니다.
오늘 합계도 응답 생성 시각까지만 집계합니다. 진행 중 수면은 현재 시각까지의 분을 이미 포함하므로 클라이언트에서 다시 더하지 않습니다.

## Insights

`days`는 1~30, `zoneId` 기본값은 `Asia/Seoul`입니다. 오늘을 포함한 기간을 조회하며 `from`/`to`는 표시용 날짜 양 끝을 모두 포함합니다.

- 아이별 일일 분유 합계/횟수, 수면 분, 소변/대변 횟수와 기간 평균
- 평균 1회 수유량, 최소/최대 수유량, 같은 아이의 연속 기록 간 평균 수유 간격
- 조회 범위 안에서의 최장 수면. 진행 중 수면은 현재까지만 반영
- 자정을 넘는 수면은 날짜별 겹치는 부분으로 분리
- 기록 없는 날도 분모에 포함. 오늘은 부분 일자이며 `recordedDays`로 기록된 날 수를 안내
- 표본이 없는 1회 수유량/간격/최장 수면은 `null`. 일일 합계는 0

통계는 관측된 기록만 설명하며 진단이나 실제 생활 전체를 추정하지 않습니다.

## Event timeline

`from`은 포함, `to`는 제외하는 UTC 시각이며 최대 조회 범위는 31일입니다. `childId`와 `types`는 선택 필터입니다.

```text
GET /api/v1/families/{familyId}/events
    ?from=2026-08-31T00:00:00Z
    &to=2026-09-01T00:00:00Z
    &childId={childId}
    &types=FEEDING
    &types=SLEEP
```

응답의 `events`는 최신 발생 시각 순입니다. 수면은 조회 시작 전에 잠들었더라도 조회 구간과 겹치면 포함됩니다. `eventType`은 `FEEDING`, `DIAPER`, `SLEEP` 중 하나이며 유형별 필드는 nullable입니다.

## Health

ECS container health check에는 DB를 조회하지 않는 `/actuator/health/liveness`를 사용합니다. `/actuator/health/readiness`는 DB를 포함한 요청 처리 준비 상태를 확인할 때만 사용합니다. 상세 DB 정보나 내부 구성은 응답에 노출하지 않습니다.

## 오류

오류는 RFC 9457 Problem Details 형식으로 반환합니다. 검증 오류는 400, 존재하지 않는 리소스는 404, 현재 상태와 충돌하는 요청은 409, 외부 서비스 설정/장애는 503/502입니다.
