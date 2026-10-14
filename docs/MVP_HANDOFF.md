# MVP 구현 인수인계 (2026-10-14)

## 구현 및 검증

- 기존 Dashboard/Timeline/인사이트를 유지하고 Cognito 이메일 로그인(PKCE), 가족별 권한, 소유자 전용 일회성 초대(24시간)를 추가했다.
- 첫째/둘째/둘 다를 포함하는 정형 음성 명령을 후보 이벤트로 해석한다. 확인 전에는 저장하지 않으며, 일부 해석 불가 문장도 통째로 거부한다.
- `care-batches`는 요청 UUID와 payload hash로 재전송을 구분한다. 한 묶음의 이벤트는 모두 저장되거나 모두 취소된다. Web 빠른 기록과 음성 기록은 이 경로를 사용한다.
- 음성 저장 응답 유실 시 같은 요청 ID로 재확인한다. 재확인 전에는 문장 변경·시트 닫기를 잠근다. 브라우저 종료/페이지 이동까지 복구하는 영구 오프라인 큐는 아니다.
- 실제 PostgreSQL에서 발견한 시간 정밀도 문제를 수정했다. 오늘 합계 조회의 종료 경계가 마이크로초로 유지되어 방금 저장한 이벤트가 누락되지 않는다.
- 백엔드 `test postgresTest bootJar` 통과. 프론트엔드 48개 테스트, TypeScript, ESLint, 정적 export 빌드 통과. CloudFormation ecr/stack/auth/web lint 통과.
- V2는 기존 V1을 수정하지 않는 추가 migration이다. 운영 적용 전에 snapshot/백업을 확보한다.

## 환경별 인증

- 기본/운영: `AUTH_ISSUER`, `AUTH_CLIENT_ID` 필수. access token의 서명·issuer·시간·token_use·client_id 검사 후 가족 membership을 확인한다.
- `local`: H2, 인증 비활성. `local-db`: PostgreSQL, 인증 비활성. 두 프로필은 로컬 개발 전용이며 외부 공개 금지.
- Web: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_AUTH_DOMAIN`, `NEXT_PUBLIC_AUTH_CLIENT_ID`, `NEXT_PUBLIC_AUTH_REDIRECT_URI`를 빌드 시 제공한다. API URL은 `/api/v1` 없는 origin, callback은 정확한 HTTPS `/dashboard` URL이다.
- access token은 메모리에만 보관한다. 새로고침/만료 시 재로그인이 필요하다. Cognito 세션이 남아 있으면 자격 증명 재입력 없이 돌아올 수 있다. PKCE 임시 state/verifier만 sessionStorage에 저장한다.
- 요청 제한은 태스크별 메모리 기반 API 120회/분, STT 10회/분이다. 여러 태스크의 공통 한도나 비용 차단 장치는 아니다.
- OpenAI 키/DB 암호는 서버 secret으로만 주입한다. `.env.example`에는 실제 키를 넣지 않는다.

## 추가 API

| 요청 | 동작 |
|---|---|
| GET `/api/v1/session/config` | 인증 필요 여부 (공개) |
| POST `/api/v1/session` | 로그인 주체를 내부 사용자와 연결하고 familyId 반환 |
| POST `/api/v1/families/{id}/invites` | OWNER만 초대 코드 발급 |
| POST `/api/v1/invites/accept` | `token`으로 가족 참여 |
| POST `/api/v1/families/{id}/voice/parse` | `text` → `events`, 저장하지 않음 |
| POST `/api/v1/families/{id}/care-batches` | `requestId`, `events` 원자적·멱등 저장 |

이벤트 후보: `childId`, `type`(FEEDING/PEE/POOP/SLEEP_START/SLEEP_END), FEEDING만 `amountMl`(1~2000). 최대 16개. 기존 단일 이벤트 API는 호환성 때문에 남아 있고 인증/작성자 검사를 적용하지만 멱등 키는 지원하지 않는다.

## AWS 배포 순서 (아직 미실행)

1. root 액세스 키 대신 배포 전용 IAM 역할/SSO 프로필을 준비한다. root 키를 대화나 저장소에 복사하지 않는다.
2. 서울 리전 상시 ECS+Aurora 구성의 전체 비용 견적과 예산을 승인한다. 기존 전체 월 1만원대 요구는 충족하지 못한다. AWS Budgets 알림은 지출 상한이 아니다.
3. `infra/aws/web.yml`로 비공개 S3 + CloudFront HTTPS origin을 준비한다. 별도 사용자 도메인 없이 CloudFront 기본 도메인을 쓸 수 있다.
4. 그 origin의 `/dashboard`를 callback으로 `infra/aws/auth.yml`을 설정한다. 출력 AuthIssuer/AuthClientId는 backend stack, AuthDomain/AuthClientId는 Web 빌드 설정에 연결한다.
5. API 도메인과 서울 ACM 인증서, 허용 IP, ECR 이미지, DB 버전, Secrets Manager 값으로 `parameters.local.yml`을 채운다. `stack.yml` 배포 절차는 AWS_DEPLOYMENT.md를 따른다. CORS는 Web origin만 허용한다.
6. Web 공개 설정을 넣고 `STATIC_EXPORT=1 npm run build -- --webpack` 실행. `web/out/`을 S3로 업로드하고 CloudFront 캐시를 무효화한다. 환경변수 변경은 재빌드가 필요하다.
7. 실제 Cognito 가입/로그인 → 가족 생성 → 보호자 초대 → 양쪽 기기 저장/조회 → 권한 거부 → 음성 확인 저장을 검증한다. 성공 전 IP 제한을 풀지 않는다.

## 출시 전에 남은 확인

- 실제 AWS 리소스 생성, Aurora TLS 연결/백업 복원, ECS ARM64 이미지 실행 및 재시작 후 데이터 유지.
- 실제 Cognito 로그인과 두 보호자의 서로 다른 기기 공유. 현재 인증 테스트는 mock JWT이므로 실제 서명·Hosted UI E2E를 대신하지 않는다.
- 실제 OpenAI STT와 iPhone Safari/Android Chrome 마이크 권한·녹음 형식·터치 UX.
- 모니터링/장애 알림 수신자, 예산 알림, 잘못된 기록 정정 지원 절차.
- 현재 제공되지 않는 AI 대화·의료 판단·기록 수정/삭제 UI는 MVP 제외 범위다.

AWS 리소스 배포는 아직 실행하지 않았다. 소스 반영 상태는 Git 이력을 기준으로 확인한다.
