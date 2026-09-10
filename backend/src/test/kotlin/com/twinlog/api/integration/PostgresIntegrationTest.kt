package com.twinlog.api.integration

import org.junit.jupiter.api.Tag
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import javax.sql.DataSource
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@Tag("postgres")
@SpringBootTest
class PostgresIntegrationTest(
    @Autowired private val dataSource: DataSource,
    @Autowired private val jdbc: JdbcTemplate,
) {
    @Test
    fun `native PostgreSQL applies Flyway schema and validates JPA mappings`() {
        dataSource.connection.use { connection ->
            assertEquals("PostgreSQL", connection.metaData.databaseProductName)
            assertTrue(connection.metaData.databaseMajorVersion >= 16)
        }
        assertEquals(1, jdbc.queryForObject(
            "select count(*) from flyway_schema_history where success = true and version = '1'",
            Int::class.java,
        ))
        // Ensures PostgreSQL-native column types, not H2 compatibility mode.
        assertEquals("timestamp with time zone", jdbc.queryForObject(
            """select data_type from information_schema.columns
               where table_schema = 'public' and table_name = 'baby_events' and column_name = 'occurred_at'""",
            String::class.java,
        ))
    }
}
