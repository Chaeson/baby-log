package com.twinlog.api.voice.application

import com.twinlog.api.common.InvalidRequestException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

data class VoiceAudio(
    val bytes: ByteArray,
    val contentType: String,
    val filename: String,
)

data class TranscriptionResult(
    val text: String,
    val model: String,
)

fun interface SpeechToTextClient {
    fun transcribe(audio: VoiceAudio): TranscriptionResult
}

@Service
class VoiceTranscriptionService(
    private val speechToTextClient: SpeechToTextClient,
    @Value("\${twinlog.voice.max-audio-bytes:10485760}")
    private val maxAudioBytes: Int,
) {
    fun transcribe(audio: VoiceAudio): TranscriptionResult {
        if (audio.bytes.isEmpty()) {
            throw InvalidRequestException("녹음된 오디오가 비어 있습니다")
        }
        if (audio.bytes.size > maxAudioBytes) {
            throw InvalidRequestException("오디오는 10MB 이하로 녹음해 주세요")
        }

        val baseContentType = audio.contentType.substringBefore(';').trim().lowercase()
        if (baseContentType !in SUPPORTED_CONTENT_TYPES) {
            throw InvalidRequestException("지원하지 않는 오디오 형식입니다")
        }

        return speechToTextClient.transcribe(audio)
    }

    private companion object {
        val SUPPORTED_CONTENT_TYPES = setOf(
            "audio/webm",
            "audio/mp4",
            "audio/mpeg",
            "audio/ogg",
            "audio/wav",
            "audio/x-wav",
        )
    }
}
