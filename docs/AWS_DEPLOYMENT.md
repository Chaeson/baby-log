# ECS + Aurora 배포 준비

기존 Kotlin/Spring Boot API와 Flyway V1 스키마를 그대로 사용한다. 새 백엔드를 다시 만드는 작업이 아니다.
`infra/aws/stack.yml`은 **서울 리전의 IP 제한 파일럿 환경**이며 공개 서비스 출시 완료를 의미하지 않는다.
이 저장소 변경만으로 AWS 리소스가 생성되지는 않는다. 실제 계정 적용·과금은 별도 승인 후 진행한다.

## 기본 사양과 비용 경계

| 항목 | 기본값 | 의미 |
|---|---|---|
| ECS Fargate | ARM64, 0.25 vCPU, 1 GiB, On-Demand 태스크 1개 | 상시 실행, Spot/자동 중지 없음 |
| Aurora PostgreSQL | 16 계열, Serverless v2 writer 1개, 0.5~1 ACU | 자동 정지 없음, 읽기 복제본 없음 |
| 진입점 | HTTPS ALB, ACM 인증서, 운영자 IPv4 `/32` | 인증 미구현이므로 공개 접근 금지 |
| 네트워크 | AZ 2개, public 앱 서브넷 + isolated DB 서브넷 | NAT Gateway·유료 VPC endpoint 없음 |
| JVM / DB pool | heap 최대 55%, Serial GC, 연결 1~4개 | 1 GiB 시작점; 부하 검증 전 용량 보장 아님 |
| 보존 | DB 백업 7일, 로그 7일, 삭제 방지·삭제 시 snapshot | 보존 데이터도 비용 발생 |

**기존 요구인 “AWS 전체 월 1만원대”는 이 상시 가동 구성에서 충족하지 못한다.**
이번 구성은 즉시 응답을 위해 서버와 DB를 켜 두는 작은 사양의 제안이며 예산 상향 승인을 대신하지 않는다.
0.5 ACU는 정지 용량이 아니다. 최대 1 ACU도 월 지출 상한이 아니다.
[Fargate 요금](https://aws.amazon.com/fargate/pricing/), [Aurora 요금](https://aws.amazon.com/rds/aurora/pricing/)을 기준으로
서울 리전에서 다음을 **모두 포함**한 견적을 만든 뒤 적용한다:

- 월 730시간 기준 Fargate CPU/메모리와 Aurora 0.5~1 ACU 사용료
- ALB 시간당 요금·LCU, ALB 최소 두 AZ의 공인 IPv4와 ECS 태스크 공인 IPv4
- Aurora 저장 공간·I/O·초과 백업, CloudWatch 로그, Secrets Manager, ECR 이미지 저장
- DNS/도메인, 인터넷 전송료, 세금·환율, 별도 Web 호스팅과 OpenAI 사용료
- 배포 중 잠시 태스크 2개가 겹치는 비용

배포 전 AWS Budgets의 **계정 전체 월 비용** 알림을 설정한다. 알림은 지출을 차단하지 않는다.
엄격한 월 1만원대가 우선이면 ECS+Aurora 상시 가동 조건을 변경해야 한다.

## 파일과 나중에 입력할 값

- `infra/aws/ecr.yml`: 이미지 저장소를 먼저 생성. immutable release tag, push scan, tagged 이미지 보존.
- `infra/aws/stack.yml`: VPC, SG, Aurora, secret, ECS, ALB, 선택적 Route53 DNS.
- `infra/aws/parameters.example.yml`: `parameters.local.yml`로 복사 후 `REPLACE_*`를 채운다. 로컬 파일은 Git 제외.
- `backend/src/main/resources/application-prod.yml`: DB pool, HTTP thread 수 등 환경변수 기본값.
- `backend/certs/`: AWS 공식 서울 CA와 checksum. 이미지에 포함하며 JDBC `verify-full`로 호스트명까지 검증.
- `.github/workflows/backend-verify.yml`: PostgreSQL 테스트·CloudFormation lint·ARM64 빌드. AWS 배포는 하지 않음.

필수 입력은 ECR URI/ARN, 이미지 release tag, Aurora 16 minor 버전, API 도메인,
해당 도메인을 포함하는 **서울 리전에서 발급 완료된 ACM 인증서 ARN**, Web HTTPS origin, 허용할 공인 IP다.
`HostedZoneId`가 비어 있으면 DNS를 수동으로 ALB에 연결한다. Route53 자동 등록 시 public zone을 지정한다.
인증서 발급·도메인 구매·Web 호스팅은 이 stack에 포함되지 않는다.

## 배포 전 로컬 검증

Java 21과 Docker가 필요하다. 테스트용 DB는 실데이터와 분리된 `twinlog_test`만 사용한다.

```bash
# 저장소 루트
docker compose -f compose.test.yml up -d --wait
cd backend
./gradlew test bootJar
PG_TEST_URL=jdbc:postgresql://127.0.0.1:15432/twinlog_test \
PG_TEST_USERNAME=twinlog_test PG_TEST_PASSWORD=local-test-only-password \
  ./gradlew postgresTest
```

같은 DB를 둔 채 `postgresTest`를 한 번 더 실행하면 새 애플리케이션 프로세스에서 Flyway 재실행과 API 동작을 확인한다.
테스트는 가족·아이·기록 저장, 날짜 조회, 동시 수면 시작, PostgreSQL 타입과 Hibernate validate를 포함한다.
설정이 없거나 원격 DB 주소이면 `postgresTest`는 실패하며 H2로 대체하지 않는다.
테스트 전용 compose에는 영구 volume이 없다. 정지하면 테스트 DB가 사라지므로 실제 기록을 넣지 않는다.

```bash
# 저장소 루트; Docker 실행 엔진이 있는 환경
docker compose config --quiet
uvx --from cfn-lint==1.46.0 cfn-lint --template infra/aws/ecr.yml infra/aws/stack.yml --regions ap-northeast-2
docker buildx build --platform linux/arm64 --load -t twinlog-backend:verify ./backend
```

실제 제품 흐름은 `docker compose up --build`로 지속형 로컬 PostgreSQL과 API를 함께 띄워 확인한다.
이 기본 compose는 **로컬 전용 비밀번호와 HTTP**를 사용하며 AWS 운영 배포용이 아니다.
Aurora 네트워크·TLS·권한과 0.25 vCPU 부하는 별도 파일럿 검증이 필요하다.

## AWS 적용 순서 (아직 실행하지 않음)

AWS CLI v2, Docker buildx, 적절한 IAM 배포 권한, 예산 승인과 위 필수값을 준비한다.
다음 명령은 실행하는 시점에 AWS 상태를 변경한다. 예시의 `REPLACE_*`를 그대로 실행하지 않는다.

### 1. 엔진 버전 확인과 이미지 준비

minor 버전을 추측해 고정하지 않는다. 계정/리전에서 제공하는 16 계열 값을 확인한 뒤 `AuroraEngineVersion`에 넣는다.

```bash
aws rds describe-orderable-db-instance-options --region ap-northeast-2 \
  --engine aurora-postgresql --db-instance-class db.serverless \
  --query 'OrderableDBInstanceOptions[].EngineVersion' --output text

aws cloudformation deploy --region ap-northeast-2 --stack-name twinlog-images \
  --template-file infra/aws/ecr.yml
aws cloudformation describe-stacks --region ap-northeast-2 --stack-name twinlog-images \
  --query 'Stacks[0].Outputs'
```

반환된 `RepositoryUri`와 `RepositoryArn`을 사용한다. 이미지는 **현재 테스트한 변경을 포함**해 빌드하고
동일 태그를 덮어쓰지 않는다. Git 커밋 SHA 등 고유 release ID를 쓴다.

```bash
aws ecr get-login-password --region ap-northeast-2 | docker login \
  --username AWS --password-stdin REPLACE_ACCOUNT.dkr.ecr.ap-northeast-2.amazonaws.com
docker buildx build --platform linux/arm64 --push \
  -t REPLACE_REPOSITORY_URI:REPLACE_RELEASE_ID ./backend
```

### 2. 변경 계획 검토 후 실행

`parameters.local.yml`의 필수 항목을 채우고 새 배포는 `CREATE`, 기존 stack 변경은 `UPDATE`로 둔다.
UPDATE도 모든 기존 parameter 값을 유지해 넣고 `ChangeSetName`만 새 release ID로 바꾼다.

```bash
aws cloudformation create-change-set --region ap-northeast-2 \
  --cli-input-yaml file://infra/aws/parameters.local.yml \
  --template-body file://infra/aws/stack.yml
aws cloudformation describe-change-set --region ap-northeast-2 \
  --stack-name twinlog-pilot --change-set-name REPLACE_RELEASE_ID
# 리소스·DB replacement 여부·월 비용을 확인한 뒤에만 실행
aws cloudformation execute-change-set --region ap-northeast-2 \
  --stack-name twinlog-pilot --change-set-name REPLACE_RELEASE_ID
```

DNS 적용 이후 허용된 IP에서 `https://API_DOMAIN/actuator/health/readiness`의 `UP`을 확인한다.
Web에는 `NEXT_PUBLIC_API_BASE_URL=https://API_DOMAIN`을 **빌드 시** 지정한다.
`WebAllowedOrigins`는 실제 Web origin과 일치해야 한다. CORS는 인증이나 접근 제어가 아니다.
IP 제한은 브라우저 사용자의 공인 IP에 적용된다. 이동통신/Wi-Fi 전환 시 parameter를 업데이트해야 한다.

## DB 초기화, 비밀값과 권한

빈 Aurora에서 앱이 시작하면 기존 Flyway V1이 스키마를 생성하고 Hibernate는 `validate`만 실행한다.
`local` 프로필/Hibernate `create-drop`을 운영에 사용하지 않는다. 후속 스키마 변경은 V2부터 추가한다.
비밀번호는 Secrets Manager가 생성하고 CloudFormation은 dynamic reference만 사용한다.
앱에는 ECS execution role이 필요한 secret 값만 주입하고 task role에는 AWS API 권한을 주지 않는다.

`AppDatabaseSecretArn`이 비어 있으면 초기 연결 확인을 위해 앱도 migration 관리자 계정을 사용한다.
**실제 가족 기록을 넣기 전에** 다음 전환이 필요하다:

1. 승인된 VPC 내부 관리 연결로 별도 로그인 DB 사용자를 생성한다. DB는 인터넷에서 직접 접속할 수 없다.
2. `twinlog` DB CONNECT, public schema USAGE, 앱 테이블 SELECT/INSERT/UPDATE/DELETE만 부여한다.
   후속 migration의 테이블에도 필요한 권한이 이어지도록 migration 소유자의 default privileges를 설정한다.
3. 해당 사용자의 `username`/`password` JSON을 같은 리전의 Secrets Manager에 저장한다. 값을 Git/YAML에 쓰지 않는다.
4. ARN을 `AppDatabaseSecretArn`에 넣고 새 change set으로 task를 교체한다. `SPRING_FLYWAY_USER/PASSWORD`는 관리자로 유지된다.

위 분리는 **DB 연결 권한 분리**다. 아직 같은 앱 프로세스에 Flyway 관리자 secret이 있으므로 완전한 권한 격리는 아니다.
공개 출시 전에는 migration을 전용 일회성 task로 옮기고 서비스에서 관리자 secret을 제거해야 한다.
현재 구현은 IP 제한 파일럿용이며 로그인·가족별 권한 검사·초대·요청 제한도 공개 전 필수다.

`OpenAiSecretArn`은 JSON이 아닌 **API key 하나의 SecretString**을 가리킨다. 비어 있으면 기존 STT는 미설정 오류를 반환한다.
선택적 secret은 같은 계정·서울 리전과 AWS-managed Secrets Manager 암호화 키를 전제로 한다.
고객 관리 KMS 키를 쓰면 execution role의 scoped `kms:Decrypt`와 key policy를 별도로 추가해야 한다.

비밀번호 자동 회전은 아직 구성하지 않았다. 회전 시 DB 비밀번호와 secret을 함께 변경해야 한다.
Secret만 수정해도 DB 암호가 바뀌는 것은 아니며, 이미 실행 중인 태스크의 환경변수도 갱신되지 않는다.
일치 확인 후 `aws ecs update-service --force-new-deployment`로 태스크를 교체한다.
[AWS secret 주입 문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html),
[CloudFormation secret 갱신 주의](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-secretsmanager.html)를 참고한다.

## 운영 검증과 롤백

- 컨테이너 liveness는 JVM 상태, ALB readiness는 DB까지 확인한다. 시작 grace는 240초다.
- 기존 정상 배포가 있으면 ECS circuit breaker가 실패한 rolling 배포를 되돌린다. 최초 배포에는 되돌릴 정상 버전이 없다.
- 릴리스 rollback은 이전 ECR 태그로 `ImageUri`를 변경한다. **DB migration은 자동 rollback되지 않는다.**
- family 등록 → 분유/기저귀/수면 저장 → timeline/insight 조회 → task 교체 후 동일 기록 조회를 점검한다.
- CloudWatch CPU/메모리, ALB 오류/지연, Aurora 용량/연결 수를 보고 1 GiB와 1 ACU 상한이 충분한지 판단한다.
- 태스크 1개와 writer 1개이므로 장애/정비 시 공백이 있을 수 있다. “상시 실행”은 “무중단 보장”과 다르다.
- DB 삭제 방지가 켜져 있어 stack 삭제가 바로 완료되지 않는다. 승인된 정리 시에만 해제하고 snapshot을 확인한다.
- DB snapshot, secret, ECR 저장소와 로그는 삭제 후에도 보존될 수 있고 요금이 남는다. 수동 정리 대상과 복구 가능성을 확인한다.

## 현재 검증 범위

로컬: H2 기반 기존 테스트 18개와 운영 JAR 빌드 통과, CloudFormation 두 파일 `cfn-lint 1.46.0` 통과.
운영 JAR에서 PostgreSQL/Flyway 포함 및 H2 미포함 확인. 실DB 테스트 접속값 누락 시 안전하게 중단됨도 확인했다.
Docker/PostgreSQL 미설치 환경에서는 ARM64 이미지 빌드와 native PostgreSQL 테스트를 실행한 것으로 간주하지 않는다.
GitHub 검증 workflow는 준비만 했으며 실제 실행·AWS 계정 validation·ECS/Aurora 접속은 아직 하지 않았다.
