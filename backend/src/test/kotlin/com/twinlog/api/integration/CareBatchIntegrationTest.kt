package com.twinlog.api.integration

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.http.MediaType
import tools.jackson.databind.ObjectMapper
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
class CareBatchIntegrationTest(@Autowired val mvc: MockMvc, @Autowired val mapper: ObjectMapper) {
    @Test fun `batch replay is idempotent and failed batch rolls back all events`() {
        val setup = mapper.readTree(mvc.perform(post("/api/v1/families/setup").contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"Batch","children":[{"name":"첫째","birthOrder":1}]}"""))
            .andExpect(status().isCreated).andReturn().response.contentAsString)
        val family = setup["family"]["id"].asString(); val child = setup["children"][0]["id"].asString()
        val key = UUID.randomUUID()
        val body = """{"requestId":"$key","events":[{"childId":"$child","type":"FEEDING","amountMl":120}]}"""
        repeat(2) { mvc.perform(post("/api/v1/families/$family/care-batches").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk) }
        mvc.perform(post("/api/v1/families/$family/care-batches").contentType(MediaType.APPLICATION_JSON).content(body.replace("120", "90"))).andExpect(status().isConflict)
        mvc.perform(post("/api/v1/families/$family/care-batches").contentType(MediaType.APPLICATION_JSON)
            .content("""{"requestId":"${UUID.randomUUID()}","events":[{"childId":"$child","type":"FEEDING","amountMl":80},{"childId":"$child","type":"SLEEP_END"}]}"""))
            .andExpect(status().isConflict)
        mvc.perform(get("/api/v1/families/$family/dashboard/today")).andExpect(jsonPath("$.children[0].feedingCount").value(1))
            .andExpect(jsonPath("$.children[0].feedingTotalMl").value(120))
    }
}
