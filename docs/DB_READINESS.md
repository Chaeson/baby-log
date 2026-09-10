# DB 연결 전 검증과 다음 단계

## 완료된 연결 흐름

가족/아이 등록 → REST API 저장 → Dashboard 서버 재조회 → 날짜별 Timeline → 7/30일 인사이트.
Web의 mock 데이터는 테스트 fixture로만 사용하며 실제 화면에는 주입하지 않습니다.
브라우저 localStorage에는 가족 ID만 저장합니다. 새로고침 및 다른 페이지에서도 기록은 서버에서 가져옵니다.
통신 실패 시 샘플 데이터로 대체하지 않습니다. POST는 자동 재시도하지 않고 결과가 불확실하면 조회부터 하도록 안내합니다.

## 실DB 없이 로컬 실행

Java 21, Node.js와 설치된 의존성이 필요합니다.

```bash
# terminal 1, repository root
cd backend
./gradlew bootRun --args='--spring.profiles.active=local --server.port=8081'
```

```bash
# terminal 2, repository root
cd web
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8081 npm run dev -- --webpack --hostname 127.0.0.1
```

Web: `http://127.0.0.1:3000/dashboard`. 가족을 등록한 뒤 기록/인사이트/설정 메뉴를 확인합니다.
로컬 프로필은 H2 메모리 DB입니다. 백엔드 재시작 시 데이터가 사라지므로 테스트용 기록만 사용합니다.
남아 있는 가족 ID가 404이면 새로 가족을 등록할 수 있습니다. 기존 8080 프로세스와 공존하도록 예시는 8081을 사용합니다.

## 검증 명령

```bash
cd backend
./gradlew test bootJar
```

```bash
cd web
npm run lint
npm run test:coverage
npm run build -- --webpack
```

H2 테스트는 HTTP 계약, 날짜 경계, 동시 수면 시작, Flyway V1 실행과 Hibernate 스키마 검증을 확인합니다.
이 검증은 실제 PostgreSQL/Aurora의 SQL, TLS, 권한, 성능 검증을 대체하지 않습니다.
실제 PostgreSQL 검증용 `compose.test.yml`과 `./gradlew postgresTest`도 준비했습니다.
테스트 전용 localhost DB만 허용하며 연결값이 없으면 중단합니다. 명령은 [AWS 배포 가이드](AWS_DEPLOYMENT.md)에 있습니다.
Turbopack이 제한된 실행 환경에서 포트 생성 오류를 내면 Next가 제공하는 `--webpack` 옵션으로 빌드할 수 있습니다.

## DB를 연결하는 다음 작업

1. PostgreSQL/Aurora 인스턴스와 DB 사용자 준비. 마이그레이션용 DDL 권한과 앱 실행 권한을 운영에 맞게 결정합니다.
2. `SPRING_PROFILES_ACTIVE=prod`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `WEB_ALLOWED_ORIGINS` 주입. `prod`에는 개발용 연결값 기본값이 없습니다.
3. Aurora는 TLS 인증서 검증을 설정합니다. JDBC URL에 `sslmode=verify-full`과 올바른 서버 CA 경로를 사용합니다.
4. 빈 검증 DB에서 Flyway 실행 및 `ddl-auto=validate` 확인 후 등록·저장·조회 흐름을 실제 PostgreSQL로 다시 확인합니다.
5. DB 연결 후 애플리케이션을 재시작해 기록이 유지되는지 확인합니다.

`local` 프로필을 운영에 사용하지 않습니다. 기존 V1 migration을 수정하지 않고 이후 변경은 V2부터 추가합니다.
운영 JAR는 `backend/build/libs/twinlog.jar`이며 H2는 개발/테스트에만 사용합니다.
ECS container health check는 `liveness`, DB 준비 확인은 `readiness`입니다.
로드밸런서의 전달 헤더를 신뢰하도록 구성할 때만 `FORWARD_HEADERS_STRATEGY=framework`로 설정합니다.

## ECS/Aurora 구성 코드

`infra/aws/stack.yml`에 서울 리전 ECS Fargate ARM64 0.25 vCPU/1 GiB, Aurora Serverless v2 0.5~1 ACU,
HTTPS ALB, private DB, Secret 주입과 IP 제한을 정의했습니다. `parameters.example.yml`의 표시된 값을 나중에 입력합니다.
상시 가동 비용은 기존 전체 월 1만원대 목표와 맞지 않으므로 계정 적용 전 견적과 예산 승인이 필요합니다.
실제 AWS 리소스는 아직 생성하지 않았습니다. [배포 절차·검증 범위](AWS_DEPLOYMENT.md)를 참고하세요.

## 아직 연결하지 않은 범위

- 실제 PostgreSQL/Aurora 접속, AWS 리소스 생성, CloudFormation 적용
- 공개 서비스용 로그인/가족 구성원 권한 검사 및 초대
- AI 대화 저장/Context Builder 및 다중 아이 자연어 parsing/음성 기록 확정 저장
- 기록 수정·삭제, 서버 멱등성 키, 대량 데이터 페이지네이션

AI 화면은 아이별/공통 모드와 미연결 안내를 제공하며 응답을 만들어 내지 않습니다. 음성은 기존 STT까지만 동작합니다.
이번 완료 기준은 로컬 API 기반 제품 흐름과 DB 교체 준비입니다. 실사용자에게 공개할 준비가 끝났다는 의미는 아닙니다.
