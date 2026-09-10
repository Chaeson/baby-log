# TwinLog Web

모바일 우선 Next.js 클라이언트입니다. 오늘·기록·인사이트·설정은 실제 Backend REST API에 연결되어 있습니다.
DB 없이 전체 흐름을 확인하는 실행 방법은 [DB_READINESS.md](../docs/DB_READINESS.md)에 있습니다.

## 실행과 검증

```bash
npm install
npm run dev
```

`NEXT_PUBLIC_API_BASE_URL` 기본값은 `http://127.0.0.1:8080`입니다.
8081에 로컬 Backend를 실행했다면 해당 주소를 환경 변수로 지정합니다.
이 값은 빌드 시 포함되는 공개 URL이며 API 키 같은 비밀 값은 Web에 넣지 않습니다.

```bash
npm run lint
npm run test:coverage
npm run build -- --webpack
```

## 구조와 데이터 흐름

- `components/workspace.tsx`: 가족/아이 일괄 등록, 가족 연결 기억, 서버 snapshot 공유
- `components/navigation.tsx`: 오늘·기록·인사이트·AI·설정 페이지 링크
- `lib/api.ts`: REST DTO, 화면 모델 변환, timeout/오류 처리
- `lib/use-remote.ts`: 조회 취소와 오래된 응답 무시
- `features/dashboard`: 기존 비교표/아이 카드/입력 sheet
- `features/records`: 오늘/어제/날짜/7일/30일, 아이·기록 유형 필터
- `features/insights`: 수유·수면·대소변·아이별 비교
- `features/dashboard/mock-data.ts`: 테스트 fixture 전용

루트 layout은 서버 컴포넌트로 유지합니다. 브라우저의 가족 연결 상태를 읽는 Provider와 상호작용 화면은 클라이언트 컴포넌트입니다.
빠른 기록은 POST 완료 후 Dashboard를 다시 조회합니다. 실패 시 mock으로 대체하지 않으며 POST를 자동 재시도하지 않습니다.
진행 중 수면 시간이 이미 서버 합계에 포함되므로 화면에서 중복 합산하지 않습니다.

localStorage에는 가족 ID만 저장합니다. 가족 ID 자체는 인증 수단이 아니며 로그인과 가족 구성원 권한 검사는 공개 전에 필요합니다.

## 음성 및 AI

VoiceSheet는 사용자 동작으로 마이크 권한을 요청하고 최대 30초 녹음합니다.
기존 Backend STT에 multipart로 전송해 인식 문장을 표시합니다.
현재 음성 문장을 육아 기록으로 확정 저장하거나 AI 대화 응답을 생성하지 않습니다.
AI 메뉴는 아이별/공통 모드와 미연결 안내를 제공합니다.
