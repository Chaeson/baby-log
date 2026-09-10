package com.twinlog.api.event.application

import com.twinlog.api.event.domain.DiaperType
import java.time.Instant
import java.util.UUID

enum class TimelineEventType {
    FEEDING,
    DIAPER,
    SLEEP,
}

data class EventTimelineResponse(
    val familyId: UUID,
    val from: Instant,
    val to: Instant,
    val events: List<TimelineEventResponse>,
)

data class TimelineEventResponse(
    val id: UUID,
    val childId: UUID,
    val childName: String,
    val eventType: TimelineEventType,
    val occurredAt: Instant,
    val startedAt: Instant? = null,
    val endedAt: Instant? = null,
    val amountMl: Int? = null,
    val diaperType: DiaperType? = null,
    val memo: String? = null,
)
