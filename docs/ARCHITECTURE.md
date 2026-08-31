# Architecture

## 현재 경계

```text
Mobile browser
    │
    ▼
Next.js App Router
    ├─ Server page: 초기 데이터 로딩 경계
    └─ Client feature: 빠른 기록, sheet, timer, 즉시 UI 반영
            │
            ▼  다음 마일스톤
       typed REST client
            │
            ▼
Spring Controller ─ Application service ─ Domain/JPA model ─ Repository
                                                          │
                                                          ▼
                                                     PostgreSQL
```

Dashboard route는 Server Component로 두고, 클릭·타이머·sheet처럼 브라우저 상태가 필요한 부분만 `DashboardShell` Client Component로 분리합니다. 이렇게 하면 현재 mock을 서버 조회로 바꿀 때 화면 전체를 클라이언트 전용으로 만들 필요가 없습니다.

프론트엔드는 Backend 응답을 화면 모델로 변환하는 typed REST client를 둘 예정입니다. 컴포넌트가 URL이나 응답 DTO를 직접 알지 않게 하여 mock과 실제 API 전환 범위를 작게 유지합니다.

## Web 상태 동기화

현재 Dashboard의 빠른 기록은 로컬 state를 즉시 갱신하는 mock 동작입니다. Backend 연결 후에는 다음의 단순한 흐름으로 시작합니다.

```text
사용자 기록 → POST event → GET today dashboard → 화면 교체
```

엄마와 아빠가 동시에 기록하는 경우에도 재조회한 서버 값을 기준으로 맞춥니다. WebSocket/SSE와 복잡한 클라이언트 캐시는 실제 필요성이 확인된 뒤 도입합니다.

## Domain

- `User`와 `Family`는 `FamilyMember`를 통한 N:M 관계입니다.
- 각 `Child`는 독립 행이며 `birthOrder`로 첫째/둘째 같은 표시를 지원합니다.
- `BabyEvent`는 공통 ID, Child, 발생/생성/수정 시각, 기록자를 갖는 기반 Entity입니다.
- Feeding, Diaper, Sleep은 JOINED 상속의 별도 테이블을 사용합니다. 새 이벤트 유형은 새 subtype/table을 추가해 확장합니다.
- `source`(`WEB`, `VOICE`, `AI`, `DISCORD`, `IOS`)는 다음 Backend 마일스톤에서 공통 이벤트 메타데이터로 추가할 예정입니다.

Backend Controller는 검증된 DTO를 application service에 전달하고 Entity를 응답으로 직접 노출하지 않습니다.

## 시간 기준

이벤트 시각은 UTC `Instant`로 저장합니다. 오늘 Dashboard는 `zoneId` query parameter(기본 `Asia/Seoul`)를 받아 해당 지역의 자정 구간을 UTC로 변환해 집계합니다.

## Voice와 AI 경계

음성 transcription은 구현되어 있습니다. 브라우저별 Web Speech API 차이에 제품 핵심을 의존하지 않고 `MediaRecorder`가 만든 파일을 Backend로 전송합니다.

```text
Browser microphone
    → MediaRecorder (최대 30초)
    → POST multipart audio
    → VoiceTranscriptionService (형식/10MB 검증)
    → SpeechToTextClient
    → OpenAI /audio/transcriptions
    → 인식 문장 표시
    → [다음 단계] structured parsing → 사용자 확인 → Event 생성
```

녹음 파일은 애플리케이션 DB나 파일 시스템에 저장하지 않고 요청 중에만 메모리에서 검증·전달합니다. 사용자가 녹음 중 sheet를 닫으면 audio chunk를 폐기하고 업로드하지 않습니다.

OpenAI API 키와 호출은 Backend에만 둡니다. API 키가 없으면 503, provider 호출 실패는 안전한 502 Problem Details로 변환하며 upstream 응답 본문을 사용자에게 노출하지 않습니다. AI는 DB에 직접 접근하지 않고 Backend가 필요한 데이터만 조회해 context로 전달합니다.

## 보존 중인 iOS

`ios/`는 삭제하지 않지만 현재 빌드와 기능 개발 대상에서는 제외합니다. Web과 Backend 계약이 안정된 뒤 동일한 REST API와 도메인 용어를 사용하는 네이티브/Siri 클라이언트로 확장할 수 있습니다.
