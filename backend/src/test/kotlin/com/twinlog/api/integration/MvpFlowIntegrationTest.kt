package com.twinlog.api.integration

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.ObjectMapper
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

@SpringBootTest
@AutoConfigureMockMvc
@Import(MvpFlowTestClockConfiguration::class)
class MvpFlowIntegrationTest(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val objectMapper: ObjectMapper,
) {
    @Test
    fun `dashboard exposes each twin's latest care state without changing today's totals`() {
        val familyId = createFamily()
        val firstChildId = createChild(familyId, "첫째", "A", 1)
        val secondChildId = createChild(familyId, "둘째", "B", 2)

        recordFeeding(firstChildId, 110, "2026-08-30T10:00:00Z")
        recordFeeding(secondChildId, 90, "2026-08-31T11:05:00Z")
        recordDiaper(firstChildId, "PEE", "2026-08-31T11:00:00Z")
        recordDiaper(firstChildId, "POOP", "2026-08-31T04:00:00Z")
        recordDiaper(secondChildId, "BOTH", "2026-08-31T08:00:00Z")

        val firstSleepId = startSleep(firstChildId, "2026-08-31T08:00:00Z")
        endSleep(firstSleepId, "2026-08-31T10:55:00Z")
        startSleep(secondChildId, "2026-08-31T11:18:00Z")

        mockMvc.perform(
            get("/api/v1/families/{familyId}/dashboard/today", familyId)
                .queryParam("zoneId", "Asia/Seoul"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.generatedAt").value("2026-08-31T12:00:00Z"))
            .andExpect(jsonPath("$.children[0].feedingTotalMl").value(0))
            .andExpect(jsonPath("$.children[0].currentState.lastFeeding.amountMl").value(110))
            .andExpect(jsonPath("$.children[0].currentState.lastFeeding.occurredAt").value("2026-08-30T10:00:00Z"))
            .andExpect(jsonPath("$.children[0].currentState.sleep.status").value("AWAKE"))
            .andExpect(jsonPath("$.children[0].currentState.sleep.since").value("2026-08-31T10:55:00Z"))
            .andExpect(jsonPath("$.children[0].currentState.lastPeeAt").value("2026-08-31T11:00:00Z"))
            .andExpect(jsonPath("$.children[0].currentState.lastPoopAt").value("2026-08-31T04:00:00Z"))
            .andExpect(jsonPath("$.children[1].currentState.lastFeeding.amountMl").value(90))
            .andExpect(jsonPath("$.children[1].currentState.sleep.status").value("SLEEPING"))
            .andExpect(jsonPath("$.children[1].currentState.sleep.since").value("2026-08-31T11:18:00Z"))
            .andExpect(jsonPath("$.children[1].currentState.lastPeeAt").value("2026-08-31T08:00:00Z"))
            .andExpect(jsonPath("$.children[1].currentState.lastPoopAt").value("2026-08-31T08:00:00Z"))
    }

    @Test
    fun `family with twins can record events and compare today's dashboard`() {
        val familyId = createFamily()
        val firstChildId = createChild(familyId, "첫째", "A", 1)
        val secondChildId = createChild(familyId, "둘째", "B", 2)

        recordFeeding(firstChildId, 120)
        recordFeeding(secondChildId, 90)
        recordDiaper(firstChildId, "BOTH")

        val sleepId = startSleep(firstChildId, "2026-08-31T10:00:00Z")
        endSleep(sleepId, "2026-08-31T11:30:00Z")

        mockMvc.perform(
            get("/api/v1/families/{familyId}/dashboard/today", familyId)
                .queryParam("zoneId", "Asia/Seoul"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.date").value("2026-08-31"))
            .andExpect(jsonPath("$.children.length()").value(2))
            .andExpect(jsonPath("$.children[0].name").value("첫째"))
            .andExpect(jsonPath("$.children[0].feedingTotalMl").value(120))
            .andExpect(jsonPath("$.children[0].feedingCount").value(1))
            .andExpect(jsonPath("$.children[0].peeCount").value(1))
            .andExpect(jsonPath("$.children[0].poopCount").value(1))
            .andExpect(jsonPath("$.children[0].sleepMinutes").value(90))
            .andExpect(jsonPath("$.children[1].name").value("둘째"))
            .andExpect(jsonPath("$.children[1].feedingTotalMl").value(90))

        mockMvc.perform(
            post("/api/v1/events/feedings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"childId":"$firstChildId","amountMl":0}"""),
        ).andExpect(status().isBadRequest)

        startSleep(secondChildId, "2026-08-31T11:00:00Z")
        mockMvc.perform(
            post("/api/v1/events/sleeps/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"childId":"$secondChildId"}"""),
        ).andExpect(status().isConflict)
    }

    private fun createFamily(): String {
        val response = mockMvc.perform(
            post("/api/v1/families")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name":"우리 가족"}"""),
        )
            .andExpect(status().isCreated)
            .andReturn().response.contentAsString
        return objectMapper.readTree(response)["id"].asText()
    }

    private fun createChild(familyId: String, name: String, nickname: String, birthOrder: Int): String {
        val response = mockMvc.perform(
            post("/api/v1/families/{familyId}/children", familyId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "name":"$name",
                      "nickname":"$nickname",
                      "birthOrder":$birthOrder,
                      "birthDate":"2026-01-01"
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isCreated)
            .andReturn().response.contentAsString
        return objectMapper.readTree(response)["id"].asText()
    }

    private fun recordFeeding(childId: String, amountMl: Int, occurredAt: String? = null) {
        val occurredAtField = occurredAt?.let { ",\"occurredAt\":\"$it\"" }.orEmpty()
        mockMvc.perform(
            post("/api/v1/events/feedings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"childId":"$childId","amountMl":$amountMl$occurredAtField}"""),
        ).andExpect(status().isCreated)
    }

    private fun recordDiaper(childId: String, diaperType: String, occurredAt: String? = null) {
        val occurredAtField = occurredAt?.let { ",\"occurredAt\":\"$it\"" }.orEmpty()
        mockMvc.perform(
            post("/api/v1/events/diapers")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"childId":"$childId","diaperType":"$diaperType"$occurredAtField}"""),
        ).andExpect(status().isCreated)
    }

    private fun startSleep(childId: String, startedAt: String): String {
        val response = mockMvc.perform(
            post("/api/v1/events/sleeps/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"childId":"$childId","startedAt":"$startedAt"}"""),
        )
            .andExpect(status().isCreated)
            .andReturn().response.contentAsString
        return objectMapper.readTree(response)["id"].asText()
    }

    private fun endSleep(sleepId: String, endedAt: String) {
        mockMvc.perform(
            post("/api/v1/events/sleeps/{sleepId}/end", sleepId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"endedAt":"$endedAt"}"""),
        ).andExpect(status().isOk)
    }
}

@TestConfiguration(proxyBeanMethods = false)
class MvpFlowTestClockConfiguration {
    @Bean
    @Primary
    fun fixedClock(): Clock = Clock.fixed(Instant.parse("2026-08-31T12:00:00Z"), ZoneOffset.UTC)
}
