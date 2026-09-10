package com.twinlog.api.integration

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.ObjectMapper

@SpringBootTest
@AutoConfigureMockMvc
@Import(MvpFlowTestClockConfiguration::class)
class EventTimelineApiIntegrationTest(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val objectMapper: ObjectMapper,
) {
    @Test
    fun `family events are returned newest first and can be filtered by child and type`() {
        val familyId = createFamily()
        val firstChildId = createChild(familyId, "첫째", 1)
        val secondChildId = createChild(familyId, "둘째", 2)

        recordFeeding(firstChildId, 120, "2026-08-31T10:00:00Z")
        recordDiaper(secondChildId, "BOTH", "2026-08-31T11:00:00Z")
        val sleepId = startSleep(firstChildId, "2026-08-31T07:30:00Z")
        endSleep(sleepId, "2026-08-31T08:30:00Z")

        mockMvc.perform(
            get("/api/v1/families/{familyId}/events", familyId)
                .queryParam("from", "2026-08-31T08:00:00Z")
                .queryParam("to", "2026-08-31T12:00:00Z"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.familyId").value(familyId))
            .andExpect(jsonPath("$.events.length()").value(3))
            .andExpect(jsonPath("$.events[0].eventType").value("DIAPER"))
            .andExpect(jsonPath("$.events[0].childName").value("둘째"))
            .andExpect(jsonPath("$.events[0].diaperType").value("BOTH"))
            .andExpect(jsonPath("$.events[1].eventType").value("FEEDING"))
            .andExpect(jsonPath("$.events[1].amountMl").value(120))
            .andExpect(jsonPath("$.events[2].eventType").value("SLEEP"))
            .andExpect(jsonPath("$.events[2].startedAt").value("2026-08-31T07:30:00Z"))
            .andExpect(jsonPath("$.events[2].endedAt").value("2026-08-31T08:30:00Z"))

        mockMvc.perform(
            get("/api/v1/families/{familyId}/events", familyId)
                .queryParam("from", "2026-08-31T08:00:00Z")
                .queryParam("to", "2026-08-31T12:00:00Z")
                .queryParam("childId", firstChildId)
                .queryParam("types", "FEEDING", "SLEEP"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.events.length()").value(2))
            .andExpect(jsonPath("$.events[0].childId").value(firstChildId))
            .andExpect(jsonPath("$.events[0].eventType").value("FEEDING"))
            .andExpect(jsonPath("$.events[1].eventType").value("SLEEP"))
    }

    @Test
    fun `timeline rejects an invalid or oversized range`() {
        val familyId = createFamily()

        mockMvc.perform(
            get("/api/v1/families/{familyId}/events", familyId)
                .queryParam("from", "2026-08-31T12:00:00Z")
                .queryParam("to", "2026-08-31T12:00:00Z"),
        ).andExpect(status().isBadRequest)

        mockMvc.perform(
            get("/api/v1/families/{familyId}/events", familyId)
                .queryParam("from", "2026-07-01T00:00:00Z")
                .queryParam("to", "2026-08-31T12:00:00Z"),
        ).andExpect(status().isBadRequest)
    }

    private fun createFamily(): String {
        val response = mockMvc.perform(
            post("/api/v1/families")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name":"Timeline 가족"}"""),
        ).andExpect(status().isCreated).andReturn().response.contentAsString
        return objectMapper.readTree(response)["id"].asText()
    }

    private fun createChild(familyId: String, name: String, birthOrder: Int): String {
        val response = mockMvc.perform(
            post("/api/v1/families/{familyId}/children", familyId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name":"$name","birthOrder":$birthOrder}"""),
        ).andExpect(status().isCreated).andReturn().response.contentAsString
        return objectMapper.readTree(response)["id"].asText()
    }

    private fun recordFeeding(childId: String, amountMl: Int, occurredAt: String) {
        mockMvc.perform(
            post("/api/v1/events/feedings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"childId":"$childId","amountMl":$amountMl,"occurredAt":"$occurredAt"}"""),
        ).andExpect(status().isCreated)
    }

    private fun recordDiaper(childId: String, diaperType: String, occurredAt: String) {
        mockMvc.perform(
            post("/api/v1/events/diapers")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"childId":"$childId","diaperType":"$diaperType","occurredAt":"$occurredAt"}"""),
        ).andExpect(status().isCreated)
    }

    private fun startSleep(childId: String, startedAt: String): String {
        val response = mockMvc.perform(
            post("/api/v1/events/sleeps/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"childId":"$childId","startedAt":"$startedAt"}"""),
        ).andExpect(status().isCreated).andReturn().response.contentAsString
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
