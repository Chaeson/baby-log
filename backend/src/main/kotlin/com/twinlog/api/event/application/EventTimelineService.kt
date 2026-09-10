package com.twinlog.api.event.application

import com.twinlog.api.common.InvalidRequestException
import com.twinlog.api.common.ResourceNotFoundException
import com.twinlog.api.event.infrastructure.DiaperEventJpaRepository
import com.twinlog.api.event.infrastructure.FeedingEventJpaRepository
import com.twinlog.api.event.infrastructure.SleepEventJpaRepository
import com.twinlog.api.family.application.FamilyService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Service
class EventTimelineService(
    private val familyService: FamilyService,
    private val feedingRepository: FeedingEventJpaRepository,
    private val diaperRepository: DiaperEventJpaRepository,
    private val sleepRepository: SleepEventJpaRepository,
) {
    @Transactional(readOnly = true)
    fun getTimeline(
        familyId: UUID,
        from: Instant,
        to: Instant,
        childId: UUID?,
        types: Set<TimelineEventType>?,
    ): EventTimelineResponse {
        validateRange(from, to)

        val children = familyService.getChildren(familyId)
        if (childId != null && children.none { it.id == childId }) {
            throw ResourceNotFoundException("Child $childId was not found in family $familyId")
        }

        val selectedTypes = types?.takeIf(Set<TimelineEventType>::isNotEmpty)
            ?: TimelineEventType.entries.toSet()
        val events = buildList {
            if (TimelineEventType.FEEDING in selectedTypes) {
                addAll(
                    feedingRepository.findAllForFamilyBetween(familyId, from, to)
                        .filter { childId == null || it.child.id == childId }
                        .map {
                            TimelineEventResponse(
                                id = requireNotNull(it.id),
                                childId = requireNotNull(it.child.id),
                                childName = it.child.name,
                                eventType = TimelineEventType.FEEDING,
                                occurredAt = it.occurredAt,
                                amountMl = it.amountMl,
                                memo = it.memo,
                            )
                        },
                )
            }
            if (TimelineEventType.DIAPER in selectedTypes) {
                addAll(
                    diaperRepository.findAllForFamilyBetween(familyId, from, to)
                        .filter { childId == null || it.child.id == childId }
                        .map {
                            TimelineEventResponse(
                                id = requireNotNull(it.id),
                                childId = requireNotNull(it.child.id),
                                childName = it.child.name,
                                eventType = TimelineEventType.DIAPER,
                                occurredAt = it.occurredAt,
                                diaperType = it.diaperType,
                                memo = it.memo,
                            )
                        },
                )
            }
            if (TimelineEventType.SLEEP in selectedTypes) {
                addAll(
                    sleepRepository.findAllOverlapping(familyId, from, to)
                        .filter { childId == null || it.child.id == childId }
                        .map {
                            TimelineEventResponse(
                                id = requireNotNull(it.id),
                                childId = requireNotNull(it.child.id),
                                childName = it.child.name,
                                eventType = TimelineEventType.SLEEP,
                                occurredAt = it.startedAt,
                                startedAt = it.startedAt,
                                endedAt = it.endedAt,
                                memo = it.memo,
                            )
                        },
                )
            }
        }.sortedWith(compareByDescending<TimelineEventResponse> { it.occurredAt }.thenByDescending { it.id })

        return EventTimelineResponse(
            familyId = familyId,
            from = from,
            to = to,
            events = events,
        )
    }

    private fun validateRange(from: Instant, to: Instant) {
        if (!to.isAfter(from)) {
            throw InvalidRequestException("to must be after from")
        }
        if (Duration.between(from, to) > MAX_RANGE) {
            throw InvalidRequestException("Timeline range cannot exceed 31 days")
        }
    }

    companion object {
        private val MAX_RANGE: Duration = Duration.ofDays(31)
    }
}
