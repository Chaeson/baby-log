package com.twinlog.api.event.application

import com.twinlog.api.common.DomainConflictException
import com.twinlog.api.common.ResourceNotFoundException
import com.twinlog.api.event.domain.DiaperEventEntity
import com.twinlog.api.event.domain.FeedingEventEntity
import com.twinlog.api.event.domain.SleepEventEntity
import com.twinlog.api.event.infrastructure.DiaperEventJpaRepository
import com.twinlog.api.event.infrastructure.FeedingEventJpaRepository
import com.twinlog.api.event.infrastructure.SleepEventJpaRepository
import com.twinlog.api.family.domain.ChildEntity
import com.twinlog.api.family.infrastructure.ChildJpaRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

@Service
class BabyEventService(
    private val childRepository: ChildJpaRepository,
    private val feedingRepository: FeedingEventJpaRepository,
    private val diaperRepository: DiaperEventJpaRepository,
    private val sleepRepository: SleepEventJpaRepository,
    private val clock: Clock,
) {
    @Transactional
    fun recordFeeding(request: RecordFeedingRequest): FeedingResponse {
        val now = clock.instant()
        return feedingRepository.save(
            FeedingEventEntity(
                child = findChild(request.childId),
                occurredAt = request.occurredAt ?: now,
                amountMl = request.amountMl,
                memo = request.memo?.trim()?.takeIf(String::isNotEmpty),
                createdByUserId = request.createdByUserId,
                createdAt = now,
            ),
        ).toResponse()
    }

    @Transactional
    fun recordDiaper(request: RecordDiaperRequest): DiaperResponse {
        val now = clock.instant()
        return diaperRepository.save(
            DiaperEventEntity(
                child = findChild(request.childId),
                occurredAt = request.occurredAt ?: now,
                diaperType = request.diaperType,
                memo = request.memo?.trim()?.takeIf(String::isNotEmpty),
                createdByUserId = request.createdByUserId,
                createdAt = now,
            ),
        ).toResponse()
    }

    @Transactional
    fun startSleep(request: StartSleepRequest): SleepResponse {
        // Lock the child even when no sleep exists, serializing simultaneous starts.
        val child = childRepository.findForUpdate(request.childId)
            ?: throw ResourceNotFoundException("Child ${request.childId} was not found")
        if (sleepRepository.existsOpenForChild(request.childId)) {
            throw DomainConflictException("Child ${request.childId} already has an open sleep event")
        }

        val now = clock.instant()
        return sleepRepository.save(
            SleepEventEntity(
                child = child,
                startedAt = request.startedAt ?: now,
                memo = request.memo?.trim()?.takeIf(String::isNotEmpty),
                createdByUserId = request.createdByUserId,
                createdAt = now,
            ),
        ).toResponse()
    }

    @Transactional
    fun endSleep(sleepId: UUID, request: EndSleepRequest?): SleepResponse {
        val event = sleepRepository.findForUpdate(sleepId)
            ?: throw ResourceNotFoundException("Sleep event $sleepId was not found")
        if (event.endedAt != null) {
            throw DomainConflictException("Sleep event $sleepId has already ended")
        }

        try {
            event.end(request?.endedAt ?: clock.instant())
        } catch (exception: IllegalArgumentException) {
            throw DomainConflictException(exception.message ?: "Invalid sleep end time")
        }
        return event.toResponse()
    }

    private fun findChild(childId: UUID): ChildEntity =
        childRepository.findById(childId)
            .orElseThrow { ResourceNotFoundException("Child $childId was not found") }
}
