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

## 오류

오류는 RFC 9457 Problem Details 형식으로 반환합니다. 검증 오류는 400, 존재하지 않는 리소스는 404, 현재 상태와 충돌하는 요청은 409입니다.

