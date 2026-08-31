package com.twinlog.api.dashboard.application

import com.twinlog.api.common.InvalidRequestException
import com.twinlog.api.event.domain.DiaperType
import com.twinlog.api.event.infrastructure.DiaperEventJpaRepository
import com.twinlog.api.event.infrastructure.FeedingEventJpaRepository
import com.twinlog.api.event.infrastructure.SleepEventJpaRepository
import com.twinlog.api.family.application.FamilyService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.DateTimeException
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

data class TodayDashboardResponse(
    val familyId: UUID,
    val date: LocalDate,
    val zoneId: String,
    val children: List<ChildTodaySummaryResponse>,
)

data class ChildTodaySummaryResponse(
    val childId: UUID,
    val name: String,
    val nickname: String?,
    val birthOrder: Int,
    val feedingTotalMl: Int,
    val feedingCount: Int,
    val peeCount: Int,
    val poopCount: Int,
    val sleepMinutes: Long,
)

@Service
class DashboardService(
    private val familyService: FamilyService,
    private val feedingRepository: FeedingEventJpaRepository,
    private val diaperRepository: DiaperEventJpaRepository,
    private val sleepRepository: SleepEventJpaRepository,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun today(familyId: UUID, requestedZoneId: String): TodayDashboardResponse {
        val zoneId = parseZoneId(requestedZoneId)
        val now = clock.instant()
        val today = now.atZone(zoneId).toLocalDate()
        val from = today.atStartOfDay(zoneId).toInstant()
        val to = today.plusDays(1).atStartOfDay(zoneId).toInstant()
        val children = familyService.getChildren(familyId)

        val feedingsByChild = feedingRepository.findAllForFamilyBetween(familyId, from, to)
            .groupBy { requireNotNull(it.child.id) }
        val diapersByChild = diaperRepository.findAllForFamilyBetween(familyId, from, to)
            .groupBy { requireNotNull(it.child.id) }
        val sleepsByChild = sleepRepository.findAllOverlapping(familyId, from, to)
            .groupBy { requireNotNull(it.child.id) }

        return TodayDashboardResponse(
            familyId = familyId,
            date = today,
            zoneId = zoneId.id,
            children = children.map { child ->
                val feedings = feedingsByChild[child.id].orEmpty()
                val diapers = diapersByChild[child.id].orEmpty()
                val sleepMinutes = sleepsByChild[child.id].orEmpty().sumOf { sleep ->
                    overlapMinutes(sleep.startedAt, sleep.endedAt ?: now, from, to)
                }
                ChildTodaySummaryResponse(
                    childId = child.id,
                    name = child.name,
                    nickname = child.nickname,
                    birthOrder = child.birthOrder,
                    feedingTotalMl = feedings.sumOf { it.amountMl },
                    feedingCount = feedings.size,
                    peeCount = diapers.count { it.diaperType == DiaperType.PEE || it.diaperType == DiaperType.BOTH },
                    poopCount = diapers.count { it.diaperType == DiaperType.POOP || it.diaperType == DiaperType.BOTH },
                    sleepMinutes = sleepMinutes,
                )
            },
        )
    }

    private fun parseZoneId(raw: String): ZoneId = try {
        ZoneId.of(raw)
    } catch (_: DateTimeException) {
        throw InvalidRequestException("Unknown time zone: $raw")
    }

    private fun overlapMinutes(start: Instant, end: Instant, rangeStart: Instant, rangeEnd: Instant): Long {
        val clippedStart = maxOf(start, rangeStart)
        val clippedEnd = minOf(end, rangeEnd)
        return if (clippedEnd.isAfter(clippedStart)) Duration.between(clippedStart, clippedEnd).toMinutes() else 0
    }
}

