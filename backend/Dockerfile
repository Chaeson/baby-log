# Jammy supports both ARM64 (ECS) and AMD64 (local/CI).
# TODO(release): pin approved base-image digests after the image scan.
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /workspace

COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon

COPY src ./src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && apt-get clean \
    && groupadd --system --gid 10001 twinlog \
    && useradd --system --uid 10001 --gid twinlog --no-create-home twinlog
WORKDIR /app

COPY --from=build --chown=twinlog:twinlog /workspace/build/libs/twinlog.jar app.jar
COPY certs/ap-northeast-2-bundle.pem /app/certs/ap-northeast-2-bundle.pem

USER twinlog
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod

HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD curl --fail --silent --max-time 4 http://127.0.0.1:8080/actuator/health/liveness || exit 1

# Leave room for metaspace, thread stacks, direct buffers and audio uploads.
ENTRYPOINT ["java", "-Xms64m", "-XX:MaxRAMPercentage=55.0", "-XX:+UseSerialGC", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/app.jar"]
