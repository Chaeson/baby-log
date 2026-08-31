package com.twinlog.api.voice.infrastructure

import com.twinlog.api.common.ExternalServiceException
import com.twinlog.api.common.ExternalServiceUnavailableException
import com.twinlog.api.voice.application.VoiceAudio
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.test.web.client.response.MockRestResponseCreators.withServerError
import org.springframework.web.client.RestClient
import kotlin.test.assertEquals

class OpenAiSpeechToTextClientTest {
    @Test
    fun `calls OpenAI transcription endpoint without exposing the API key`() {
        val builder = RestClient.builder().baseUrl("https://api.openai.test/v1")
        val server = MockRestServiceServer.bindTo(builder).build()
        val client = OpenAiSpeechToTextClient(
            restClient = builder.build(),
            properties = OpenAiProperties(
                apiKey = "server-secret",
                baseUrl = "https://api.openai.test/v1",
                transcriptionModel = "gpt-4o-mini-transcribe",
            ),
        )
        server.expect(requestTo("https://api.openai.test/v1/audio/transcriptions"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer server-secret"))
            .andRespond(withSuccess("""{"text":"첫째 분유 120 먹었어"}""", MediaType.APPLICATION_JSON))

        val result = client.transcribe(
            VoiceAudio(
                bytes = "recorded-audio".toByteArray(),
                contentType = "audio/webm",
                filename = "voice.webm",
            ),
        )

        assertEquals("첫째 분유 120 먹었어", result.text)
        assertEquals("gpt-4o-mini-transcribe", result.model)
        server.verify()
    }

    @Test
    fun `rejects transcription locally when the server API key is missing`() {
        val client = OpenAiSpeechToTextClient(
            restClient = RestClient.create("https://api.openai.test/v1"),
            properties = OpenAiProperties(apiKey = ""),
        )

        assertThrows<ExternalServiceUnavailableException> {
            client.transcribe(testAudio())
        }
    }

    @Test
    fun `maps provider failures without leaking the upstream response`() {
        val builder = RestClient.builder().baseUrl("https://api.openai.test/v1")
        val server = MockRestServiceServer.bindTo(builder).build()
        val client = OpenAiSpeechToTextClient(
            restClient = builder.build(),
            properties = OpenAiProperties(apiKey = "server-secret"),
        )
        server.expect(requestTo("https://api.openai.test/v1/audio/transcriptions"))
            .andRespond(withServerError().body("sensitive upstream detail"))

        val exception = assertThrows<ExternalServiceException> {
            client.transcribe(testAudio())
        }

        kotlin.test.assertFalse(exception.message.orEmpty().contains("sensitive upstream detail"))
    }

    private fun testAudio() = VoiceAudio(
        bytes = "recorded-audio".toByteArray(),
        contentType = "audio/webm",
        filename = "voice.webm",
    )
}
