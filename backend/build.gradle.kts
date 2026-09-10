plugins {
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
    kotlin("jvm") version "2.2.21"
    kotlin("plugin.spring") version "2.2.21"
    kotlin("plugin.jpa") version "2.2.21"
    jacoco
}

group = "com.twinlog"
version = "0.1.0-SNAPSHOT"

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
    jvmToolchain(21)
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    runtimeOnly("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")
    developmentOnly("com.h2database:h2")

    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("com.h2database:h2")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.test {
    useJUnitPlatform { excludeTags("postgres") }
    finalizedBy(tasks.jacocoTestReport)
}

// Opt-in real PostgreSQL verification. Never fall back to H2 or target a live DB.
tasks.register<Test>("postgresTest") {
    description = "Verify migrations and API/concurrency flows on a disposable local PostgreSQL database"
    group = "verification"
    testClassesDirs = sourceSets.test.get().output.classesDirs
    classpath = sourceSets.test.get().runtimeClasspath
    filter {
        includeTestsMatching("com.twinlog.api.integration.PostgresIntegrationTest")
        includeTestsMatching("com.twinlog.api.integration.WorkspaceIntegrationTest")
        includeTestsMatching("com.twinlog.api.integration.MvpFlowIntegrationTest")
        includeTestsMatching("com.twinlog.api.integration.EventTimelineApiIntegrationTest")
    }
    // The external database can change without Gradle inputs changing.
    outputs.upToDateWhen { false }
    doFirst {
        val url = providers.environmentVariable("PG_TEST_URL").orNull.orEmpty()
        check(Regex("^jdbc:postgresql://(127\\.0\\.0\\.1|localhost):[0-9]+/twinlog_test(\\?.*)?$").matches(url)) {
            "PG_TEST_URL must target a disposable localhost PostgreSQL database named twinlog_test"
        }
        val username = providers.environmentVariable("PG_TEST_USERNAME").orNull
        val password = providers.environmentVariable("PG_TEST_PASSWORD").orNull
        check(!username.isNullOrBlank() && !password.isNullOrBlank()) {
            "PG_TEST_USERNAME and PG_TEST_PASSWORD are required"
        }
        systemProperty("spring.datasource.url", url)
        systemProperty("spring.datasource.username", username)
        systemProperty("spring.datasource.password", password)
        systemProperty("spring.datasource.driver-class-name", "org.postgresql.Driver")
        systemProperty("spring.flyway.enabled", "true")
        systemProperty("spring.jpa.hibernate.ddl-auto", "validate")
    }
}

tasks.bootJar {
    archiveFileName.set("twinlog.jar")
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required = true
        html.required = true
    }
}
