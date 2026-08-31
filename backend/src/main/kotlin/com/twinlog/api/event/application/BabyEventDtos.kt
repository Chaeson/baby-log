package com.twinlog.api.event.application

import com.twinlog.api.event.domain.DiaperEventEntity
import com.twinlog.api.event.domain.DiaperType
import com.twinlog.api.event.domain.FeedingEventEntity
import com.twinlog.api.event.domain.SleepEventEntity
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

data class RecordFeedingRequest(
    @field:NotNull
    val childId: UUID,
    @field:Min(1)
    @field:Max(2000)
    val amountMl: Int,
    val occurredAt: Instant? = null,
    @field:Size(max = 1000)
    val memo: String? = null,
    val createdByUserId: UUID? = null,
)

data class FeedingResponse(
    val id: UUID,
    val childId: UUID,
    val amountMl: Int,
    val occurredAt: Instant,
    val memo: String?,
    val createdByUserId: UUID?,
    val createdAt: Instant,
)

data class RecordDiaperRequest(
    @field:NotNull
    val childId: UUID,
    @field:NotNull
    val diaperType: DiaperType,
    val occurredAt: Instant? = null,
    @field:Size(max = 1000)
    val memo: String? = null,
    val createdByUserId: UUID? = null,
)

data class DiaperResponse(
    val id: UUID,
    val childId: UUID,
    val diaperType: DiaperType,
    val occurredAt: Instant,
    val memo: String?,
    val createdByUserId: UUID?,
    val createdAt: Instant,
)

data class StartSleepRequest(
    @field:NotNull
    val childId: UUID,
    val startedAt: Instant? = null,
    @field:Size(max = 1000)
    val memo: String? = null,
    val createdByUserId: UUID? = null,
)

data class EndSleepRequest(
    val endedAt: Instant? = null,
)

data class SleepResponse(
    val id: UUID,
    val childId: UUID,
    val startedAt: Instant,
    val endedAt: Instant?,
    val memo: String?,
    val createdByUserId: UUID?,
    val createdAt: Instant,
)

fun FeedingEventEntity.toResponse() = FeedingResponse(
    id = requireNotNull(id),
    childId = requireNotNull(child.id),
    amountMl = amountMl,
    occurredAt = occurredAt,
    memo = memo,
    createdByUserId = createdByUserId,
    createdAt = createdAt,
)

fun DiaperEventEntity.toResponse() = DiaperResponse(
    id = requireNotNull(id),
    childId = requireNotNull(child.id),
    diaperType = diaperType,
    occurredAt = occurredAt,
    memo = memo,
    createdByUserId = createdByUserId,
    createdAt = createdAt,
)

fun SleepEventEntity.toResponse() = SleepResponse(
    id = requireNotNull(id),
    childId = requireNotNull(child.id),
    startedAt = startedAt,
    endedAt = endedAt,
    memo = memo,
    createdByUserId = createdByUserId,
    createdAt = createdAt,
)

