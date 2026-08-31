package com.twinlog.api.event.controller

import com.twinlog.api.event.application.BabyEventService
import com.twinlog.api.event.application.DiaperResponse
import com.twinlog.api.event.application.EndSleepRequest
import com.twinlog.api.event.application.FeedingResponse
import com.twinlog.api.event.application.RecordDiaperRequest
import com.twinlog.api.event.application.RecordFeedingRequest
import com.twinlog.api.event.application.SleepResponse
import com.twinlog.api.event.application.StartSleepRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/events")
class BabyEventController(
    private val babyEventService: BabyEventService,
) {
    @PostMapping("/feedings")
    @ResponseStatus(HttpStatus.CREATED)
    fun recordFeeding(@Valid @RequestBody request: RecordFeedingRequest): FeedingResponse =
        babyEventService.recordFeeding(request)

    @PostMapping("/diapers")
    @ResponseStatus(HttpStatus.CREATED)
    fun recordDiaper(@Valid @RequestBody request: RecordDiaperRequest): DiaperResponse =
        babyEventService.recordDiaper(request)

    @PostMapping("/sleeps/start")
    @ResponseStatus(HttpStatus.CREATED)
    fun startSleep(@Valid @RequestBody request: StartSleepRequest): SleepResponse =
        babyEventService.startSleep(request)

    @PostMapping("/sleeps/{sleepId}/end")
    fun endSleep(
        @PathVariable sleepId: UUID,
        @RequestBody(required = false) request: EndSleepRequest?,
    ): SleepResponse = babyEventService.endSleep(sleepId, request)
}

