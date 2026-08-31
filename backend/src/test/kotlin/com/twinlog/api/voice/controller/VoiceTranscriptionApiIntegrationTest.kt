package com.twinlog.api.voice.controller

import com.twinlog.api.voice.application.SpeechToTextClient
import com.twinlog.api.voice.application.TranscriptionResult
import com.twinlog.api.voice.application.VoiceAudio
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.mock.web.MockMultipartFile

@SpringBootTest
@AutoConfigureMockMvc
@Import(VoiceTranscriptionApiTestConfiguration::class)
class VoiceTranscriptionApiIntegrationTest(
    @Autowired private val mockMvc: MockMvc,
) {
    @Test
    fun `browser recording can be transcribed`() {
        val audio = MockMultipartFile(
            "audio",
            "voice.webm",
            "audio/webm",
            "recorded-audio".toByteArray(),
        )

        mockMvc.perform(multipart("/api/v1/voice/transcriptions").file(audio))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.text").value("둘째 응가했어"))
            .andExpect(jsonPath("$.model").value("gpt-4o-mini-transcribe"))
    }

    @Test
    fun `local web origin can call the voice API`() {
        mockMvc.perform(
            options("/api/v1/voice/transcriptions")
                .header("Origin", "http://127.0.0.1:3000")
                .header("Access-Control-Request-Method", "POST"),
        )
            .andExpect(status().isOk)
            .andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:3000"))
    }
}

@TestConfiguration(proxyBeanMethods = false)
class VoiceTranscriptionApiTestConfiguration {
    @Bean
    @Primary
    fun testSpeechToTextClient(): SpeechToTextClient = object : SpeechToTextClient {
        override fun transcribe(audio: VoiceAudio): TranscriptionResult = TranscriptionResult(
            text = "둘째 응가했어",
            model = "gpt-4o-mini-transcribe",
        )
    }
}
