package com.twinlog.api.voice.application

import com.twinlog.api.common.InvalidRequestException
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals

class VoiceTranscriptionServiceTest {
    private val client = CapturingSpeechToTextClient()
    private val service = VoiceTranscriptionService(client, maxAudioBytes = 16)

    @Test
    fun `supported browser audio is sent to speech to text provider`() {
        val result = service.transcribe(
            VoiceAudio(
                bytes = "voice".toByteArray(),
                contentType = "audio/webm;codecs=opus",
                filename = "voice.webm",
            ),
        )

        assertEquals("첫째 분유 120 먹었어", result.text)
        assertEquals("gpt-4o-mini-transcribe", result.model)
        assertEquals("audio/webm;codecs=opus", client.captured?.contentType)
    }

    @Test
    fun `empty audio is rejected before calling provider`() {
        assertThrows<InvalidRequestException> {
            service.transcribe(VoiceAudio(ByteArray(0), "audio/webm", "voice.webm"))
        }
        assertEquals(0, client.callCount)
    }

    @Test
    fun `oversized audio is rejected before calling provider`() {
        assertThrows<InvalidRequestException> {
            service.transcribe(VoiceAudio(ByteArray(17), "audio/webm", "voice.webm"))
        }
        assertEquals(0, client.callCount)
    }

    @Test
    fun `unsupported content type is rejected before calling provider`() {
        assertThrows<InvalidRequestException> {
            service.transcribe(VoiceAudio("voice".toByteArray(), "text/plain", "voice.txt"))
        }
        assertEquals(0, client.callCount)
    }
}

private class CapturingSpeechToTextClient : SpeechToTextClient {
    var captured: VoiceAudio? = null
    var callCount: Int = 0

    override fun transcribe(audio: VoiceAudio): TranscriptionResult {
        callCount += 1
        captured = audio
        return TranscriptionResult(
            text = "첫째 분유 120 먹었어",
            model = "gpt-4o-mini-transcribe",
        )
    }
}
