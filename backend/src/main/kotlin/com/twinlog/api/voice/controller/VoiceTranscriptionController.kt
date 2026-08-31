package com.twinlog.api.voice.controller

import com.twinlog.api.voice.application.TranscriptionResult
import com.twinlog.api.voice.application.VoiceAudio
import com.twinlog.api.voice.application.VoiceTranscriptionService
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/v1/voice")
class VoiceTranscriptionController(
    private val voiceTranscriptionService: VoiceTranscriptionService,
) {
    @PostMapping(
        "/transcriptions",
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun transcribe(@RequestPart("audio") audio: MultipartFile): TranscriptionResult =
        voiceTranscriptionService.transcribe(
            VoiceAudio(
                bytes = audio.bytes,
                contentType = audio.contentType ?: MediaType.APPLICATION_OCTET_STREAM_VALUE,
                filename = audio.originalFilename?.takeIf { it.isNotBlank() } ?: "voice-audio",
            ),
        )
}
