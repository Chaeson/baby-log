package com.twinlog.api.event.controller

import com.twinlog.api.event.application.EventTimelineResponse
import com.twinlog.api.event.application.EventTimelineService
import com.twinlog.api.event.application.TimelineEventType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1/families/{familyId}/events")
class EventTimelineController(
    private val eventTimelineService: EventTimelineService,
) {
    @GetMapping
    fun timeline(
        @PathVariable familyId: UUID,
        @RequestParam from: Instant,
        @RequestParam to: Instant,
        @RequestParam(required = false) childId: UUID?,
        @RequestParam(required = false) types: Set<TimelineEventType>?,
    ): EventTimelineResponse = eventTimelineService.getTimeline(familyId, from, to, childId, types)
}
