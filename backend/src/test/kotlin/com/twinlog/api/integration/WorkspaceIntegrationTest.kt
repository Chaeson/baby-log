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
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals

@SpringBootTest
@AutoConfigureMockMvc
@Import(MvpFlowTestClockConfiguration::class)
class WorkspaceIntegrationTest(
    @Autowired private val mvc: MockMvc,
    @Autowired private val mapper: ObjectMapper,
) {
    @Test
    fun `simultaneous sleep starts create one record and reject the duplicate`() {
        val setup = mapper.readTree(mvc.perform(post("/api/v1/families/setup")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"동시 기록 가족","children":[{"name":"첫째","birthOrder":1}]}"""))
            .andExpect(status().isCreated).andReturn().response.contentAsString)
        val childId = setup["children"][0]["id"].asString()
        val start = CountDownLatch(1)
        val pool = Executors.newFixedThreadPool(2)
        try {
            val requests = (1..2).map {
                pool.submit<Int> {
                    start.await(5, TimeUnit.SECONDS)
                    mvc.perform(post("/api/v1/events/sleeps/start").contentType(MediaType.APPLICATION_JSON)
                        .content("""{"childId":"$childId"}"""))
                        .andReturn().response.status
                }
            }
            start.countDown()
            assertEquals(listOf(201, 409), requests.map { it.get(10, TimeUnit.SECONDS) }.sorted())
        } finally { pool.shutdownNow() }
    }

    @Test
    fun `onboarding timeline dashboard and insights use the same records`() {
        val setup = mapper.readTree(mvc.perform(post("/api/v1/families/setup")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"테스트 가족","children":[{"name":"첫째","birthOrder":1},{"name":"둘째","birthOrder":2}]}"""))
            .andExpect(status().isCreated).andReturn().response.contentAsString)
        val familyId = setup["family"]["id"].asString()
        val childId = setup["children"][0]["id"].asString()
        mvc.perform(get("/api/v1/families/$familyId")).andExpect(jsonPath("$.name").value("테스트 가족"))
        mvc.perform(post("/api/v1/events/feedings").contentType(MediaType.APPLICATION_JSON)
            .content("""{"childId":"$childId","amountMl":120}"""))
            .andExpect(status().isCreated)
        val sleepId = mapper.readTree(mvc.perform(post("/api/v1/events/sleeps/start")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"childId":"$childId","startedAt":"2026-08-30T14:30:00Z"}"""))
            .andExpect(status().isCreated).andReturn().response.contentAsString)["id"].asString()
        mvc.perform(get("/api/v1/families/$familyId/dashboard/today"))
            .andExpect(jsonPath("$.children[0].currentState.sleep.eventId").value(sleepId))
            .andExpect(jsonPath("$.children[0].feedingTotalMl").value(120))
        mvc.perform(post("/api/v1/events/sleeps/$sleepId/end").contentType(MediaType.APPLICATION_JSON)
            .content("""{"endedAt":"2026-08-30T15:30:00Z"}"""))
            .andExpect(status().isOk)
        mvc.perform(get("/api/v1/families/$familyId/insights").param("days", "2"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.children[0].averageDailyFeedingMl").value(60.0))
            .andExpect(jsonPath("$.children[0].averageFeedingMl").value(120.0))
            .andExpect(jsonPath("$.children[0].days[0].sleepMinutes").value(30))
            .andExpect(jsonPath("$.children[0].days[1].sleepMinutes").value(30))
            .andExpect(jsonPath("$.children[1].recordedDays").value(0))
        mvc.perform(get("/api/v1/families/$familyId/insights").param("days", "31"))
            .andExpect(status().isBadRequest)
        mvc.perform(get("/api/v1/families/$familyId/insights").param("zoneId", "unknown"))
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `onboarding rejects invalid nested children and duplicate birth order`() {
        for (children in listOf("[]", "[{\"name\":\"\",\"birthOrder\":1}]", "[{\"name\":\"A\",\"birthOrder\":1},{\"name\":\"B\",\"birthOrder\":1}]")) {
            mvc.perform(post("/api/v1/families/setup").contentType(MediaType.APPLICATION_JSON)
                .content("""{"name":"가족","children":$children}"""))
                .andExpect(status().isBadRequest)
        }
    }
}
