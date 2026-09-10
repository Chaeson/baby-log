package com.twinlog.api.integration

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals

// This checks Flyway/JPA compatibility in H2, not PostgreSQL-specific behavior.
@SpringBootTest(properties = [
    "spring.datasource.url=jdbc:h2:mem:migrations;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
    "spring.flyway.enabled=true",
    "spring.jpa.hibernate.ddl-auto=validate",
])
class MigrationIntegrationTest(@Autowired private val jdbc: JdbcTemplate) {
    @Test
    fun `versioned schema is applied and validated without Hibernate creating tables`() {
        assertEquals(1, jdbc.queryForObject("select count(*) from flyway_schema_history where success = true and version = '1'", Int::class.java))
        assertEquals(0, jdbc.queryForObject("select count(*) from families", Int::class.java))
    }
}
