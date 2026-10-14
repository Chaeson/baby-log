package com.twinlog.api.integration

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.http.MediaType
import tools.jackson.databind.ObjectMapper
import java.util.UUID

@SpringBootTest(properties = ["twinlog.auth.enabled=true", "twinlog.auth.issuer=https://issuer.example", "twinlog.auth.client-id=test", "spring.datasource.url=jdbc:h2:mem:security;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"])
@AutoConfigureMockMvc
class MvpSecurityIntegrationTest(@Autowired val mvc: MockMvc, @Autowired val mapper: ObjectMapper) {
    @MockitoBean lateinit var decoder: JwtDecoder
    private fun identity(id: UUID) = jwt().jwt { it.subject(id.toString()) }
    private fun session(id: UUID) = mvc.perform(post("/api/v1/session").with(identity(id))).andExpect(status().isOk)
    @Test fun `anonymous access is denied and families cannot access one another`() {
        mvc.perform(get("/api/v1/families/${UUID.randomUUID()}")).andExpect(status().isUnauthorized)
        val owner = UUID.randomUUID(); val stranger = UUID.randomUUID()
        session(owner); session(stranger)
        val family = mapper.readTree(mvc.perform(post("/api/v1/families/setup").with(identity(owner)).contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"가족","children":[{"name":"첫째","birthOrder":1},{"name":"둘째","birthOrder":2}]}"""))
            .andExpect(status().isCreated).andReturn().response.contentAsString)
        val id = family["family"]["id"].asString(); val child = family["children"][0]["id"].asString()
        listOf("", "/children", "/dashboard/today", "/insights").forEach {
            mvc.perform(get("/api/v1/families/$id$it").with(identity(stranger))).andExpect(status().isForbidden)
        }
        mvc.perform(post("/api/v1/events/feedings").with(identity(stranger)).contentType(MediaType.APPLICATION_JSON)
            .content("""{"childId":"$child","amountMl":120}""")).andExpect(status().isForbidden)
        val token = mapper.readTree(mvc.perform(post("/api/v1/families/$id/invites").with(identity(owner)))
            .andExpect(status().isOk).andReturn().response.contentAsString)["token"].asString()
        mvc.perform(post("/api/v1/invites/accept").with(identity(stranger)).contentType(MediaType.APPLICATION_JSON)
            .content("""{"token":"$token"}""")).andExpect(status().isOk)
        mvc.perform(get("/api/v1/families/$id").with(identity(stranger))).andExpect(status().isOk)
        val other = UUID.randomUUID(); session(other)
        mvc.perform(post("/api/v1/invites/accept").with(identity(other)).contentType(MediaType.APPLICATION_JSON)
            .content("""{"token":"$token"}""")).andExpect(status().isConflict)
        mvc.perform(post("/api/v1/families/$id/invites").with(identity(stranger))).andExpect(status().isForbidden)
    }
}
