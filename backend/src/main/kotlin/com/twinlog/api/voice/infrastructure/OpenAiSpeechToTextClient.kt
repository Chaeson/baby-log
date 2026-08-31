package com.twinlog.api.voice.infrastructure

import com.twinlog.api.common.ExternalServiceException
import com.twinlog.api.common.ExternalServiceUnavailableException
import com.twinlog.api.voice.application.SpeechToTextClient
import com.twinlog.api.voice.application.TranscriptionResult
import com.twinlog.api.voice.application.VoiceAudio
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpEntity
import org.springframework.http.MediaType
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException

@ConfigurationProperties("twinlog.openai")
data class OpenAiProperties(
    var apiKey: String = "",
    var baseUrl: String = "https://api.openai.com/v1",
    var transcriptionModel: String = "gpt-4o-mini-transcribe",
)

@Configuration(proxyBeanMethods = false)
class OpenAiVoiceConfiguration {
    @Bean
    fun openAiRestClient(properties: OpenAiProperties): RestClient =
        RestClient.builder().baseUrl(properties.baseUrl.trimEnd('/')).build()

    @Bean
    fun speechToTextClient(
        openAiRestClient: RestClient,
        properties: OpenAiProperties,
    ): SpeechToTextClient = OpenAiSpeechToTextClient(openAiRestClient, properties)
}

class OpenAiSpeechToTextClient(
    private val restClient: RestClient,
    private val properties: OpenAiProperties,
) : SpeechToTextClient {
    override fun transcribe(audio: VoiceAudio): TranscriptionResult {
        if (properties.apiKey.isBlank()) {
            throw ExternalServiceUnavailableException(
                "음성 인식을 사용하려면 Backend에 OPENAI_API_KEY를 설정해 주세요",
            )
        }

        val audioHeaders = HttpHeaders().apply {
            contentType = MediaType.parseMediaType(audio.contentType)
        }
        val multipart = LinkedMultiValueMap<String, Any>().apply {
            add("file", HttpEntity(NamedByteArrayResource(audio.bytes, audio.filename), audioHeaders))
            add("model", properties.transcriptionModel)
            add("language", "ko")
            add("response_format", "json")
        }

        val response = try {
            restClient.post()
                .uri("/audio/transcriptions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer ${properties.apiKey}")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart)
                .retrieve()
                .body(OpenAiTranscriptionResponse::class.java)
        } catch (_: RestClientException) {
            throw ExternalServiceException("음성 인식 서비스 호출에 실패했습니다. 잠시 후 다시 시도해 주세요")
        }

        val text = response?.text?.trim().orEmpty()
        if (text.isEmpty()) {
            throw ExternalServiceException("음성을 인식하지 못했습니다. 조금 더 또렷하게 말해 주세요")
        }
        return TranscriptionResult(text = text, model = properties.transcriptionModel)
    }
}

private data class OpenAiTranscriptionResponse(
    val text: String = "",
)

private class NamedByteArrayResource(
    bytes: ByteArray,
    private val originalFilename: String,
) : ByteArrayResource(bytes) {
    override fun getFilename(): String = originalFilename
}
