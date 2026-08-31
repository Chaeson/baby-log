# TwinLog

TwinLog는 쌍둥이와 다태아를 한 화면에서 비교하고, 한 손으로 빠르게 기록하는 모바일 웹 육아 로그입니다. 단태아도 같은 모델로 지원하며 제품 방향은 **Twin-first, Voice-first, AI-assisted, Family-shared, Mobile-web-first**입니다.

1차 클라이언트는 Next.js 모바일 웹입니다. 기존 Kotlin/Spring Boot 도메인과 REST API는 유지하고, `ios/`는 삭제하지 않은 채 후속 단계로 보존합니다.

## 현재 구현 상태

모바일 Dashboard mock과 실제 음성 transcription 경로를 완료했습니다.

- `첫째 | 둘째`가 같은 열에 유지되는 오늘 비교표
- 아이별 분유·소변·대변·수면 빠른 기록
- 60/80/100/120/140ml 프리셋과 직접 입력
- 저장 후 페이지 이동 없이 Dashboard 즉시 반영
- 수면 시작/종료와 경과 시간 표시
- 최근 기록한 아이를 브라우저에 기억하는 경계
- 브라우저 마이크 녹음, 30초 자동 종료, Backend STT 업로드
- OpenAI `gpt-4o-mini-transcribe` 인식 문장 표시와 재녹음
- 모바일 다크 모드와 safe-area 대응

Dashboard의 육아 데이터는 아직 의도적으로 mock입니다. 음성은 실제 Backend API에 연결되어 있지만 인식 문장을 BabyEvent로 구조화·저장하지는 않습니다. 다음 마일스톤에서 기존 기록 API와 Dashboard 조회를 연결합니다.

## 저장소 구조

```text
TwinLog/
├── backend/  # Kotlin, Spring Boot, PostgreSQL, Flyway
├── web/      # Next.js, React, TypeScript, App Router, Tailwind CSS
├── ios/      # 보존 중인 네이티브 클라이언트 골격 (현재 우선순위 제외)
└── docs/     # 아키텍처와 API 설명
```

모노레포를 선택한 이유는 초기 단계에서 API 계약과 클라이언트 변경을 하나의 변경 단위로 추적하기 위해서입니다. 각 디렉터리는 독립적으로 빌드할 수 있습니다.

## Web 실행

요구사항: Node.js 20.9 이상

```bash
cd web
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 `/dashboard`로 이동합니다.

```bash
cd web
npm run lint
npm test
npm run test:coverage
npm run build
```

React/Next.js 구조와 mock 데이터 위치는 [web/README.md](web/README.md)에 짧게 설명되어 있습니다.

## Backend 실행

요구사항: Java 21 이상, PostgreSQL 16 이상

```bash
cd backend
createdb twinlog
DB_USERNAME=postgres DB_PASSWORD=postgres ./gradlew bootRun
```

기본 연결은 `jdbc:postgresql://localhost:5432/twinlog`입니다. `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`로 변경할 수 있으며 스키마는 Flyway가 관리합니다.

테스트는 별도 PostgreSQL 설치 없이 H2의 PostgreSQL 호환 모드에서 실행됩니다.

```bash
cd backend
./gradlew test
./gradlew clean assemble
```

### 로컬 음성 인식

로컬 확인은 PostgreSQL 없이 H2 프로필로 실행할 수 있습니다. OpenAI API Key는 Spring Backend 프로세스에만 설정하며 Git에 저장하지 않습니다.

```bash
cd backend
export OPENAI_API_KEY="YOUR_SERVER_SIDE_KEY"
./gradlew bootRun --args='--spring.profiles.active=local'
```

Web은 기본적으로 `http://127.0.0.1:8080`을 호출합니다. 다른 주소는 `web/.env.local`의 `NEXT_PUBLIC_API_BASE_URL`로 변경할 수 있습니다. 사용한 transcription 요청 형식은 [공식 OpenAI Audio API](https://developers.openai.com/api/reference/resources/audio#post/audio/transcriptions)를 따릅니다.

## 개발 순서

1. 모바일 Dashboard mock과 빠른 기록 UI — 완료
2. Web과 기존 REST API 연결
3. PostgreSQL 저장 및 기록 후 Dashboard 재조회
4. 모바일 Safari/Chrome 실제 기기 검증
5. Family/User, 인증, 초대, 기록 내역, 기본 PWA
6. 음성 녹음과 Backend STT — 완료, AI 구조화 기록과 질의 — 예정
7. 알림, 리포트, 외부 연동, iOS/Siri 확장

OpenAI API는 Backend에서만 호출하며 Web에 API 키를 두지 않습니다.

엔드포인트는 [docs/API.md](docs/API.md), 설계 경계와 다음 연결 방식은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 참고하세요.
