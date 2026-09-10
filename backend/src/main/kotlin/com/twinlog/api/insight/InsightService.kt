package com.twinlog.api.insight

import com.twinlog.api.common.InvalidRequestException
import com.twinlog.api.event.application.EventTimelineService
import com.twinlog.api.event.application.TimelineEventType
import com.twinlog.api.event.domain.DiaperType
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

data class DailyInsight(
    val date: LocalDate,
    val feedingTotalMl: Int,
    val feedingCount: Int,
    val sleepMinutes: Long,
    val peeCount: Int,
    val poopCount: Int,
)

data class ChildInsight(
    val childId: UUID,
    val name: String,
    val birthOrder: Int,
    val recordedDays: Int,
    val averageDailyFeedingMl: Double,
    val averageFeedingMl: Double?,
    val minFeedingMl: Int?,
    val maxFeedingMl: Int?,
    val averageFeedingIntervalMinutes: Double?,
    val averageDailySleepMinutes: Double,
    val longestSleepMinutes: Long?,
    val averageDailyPeeCount: Double,
    val averageDailyPoopCount: Double,
    val days: List<DailyInsight>,
)

data class InsightResponse(
    val familyId: UUID,
    val from: LocalDate,
    val to: LocalDate,
    val zoneId: String,
    val generatedAt: Instant,
    val children: List<ChildInsight>,
)

@Service
class InsightService(
    private val familyService: FamilyService,
    private val timelineService: EventTimelineService,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun summarize(familyId: UUID, days: Int, requestedZoneId: String): InsightResponse {
        if (days !in 1..30) throw InvalidRequestException("days must be between 1 and 30")
        val zone = try { ZoneId.of(requestedZoneId) } catch (_: DateTimeException) {
            throw InvalidRequestException("Unknown time zone: $requestedZoneId")
        }
        val now = clock.instant()
        val to = now.atZone(zone).toLocalDate()
        val from = to.minusDays(days.toLong() - 1)
        val fromInstant = from.atStartOfDay(zone).toInstant()
        val children = familyService.getChildren(familyId)
        val events = timelineService.getTimeline(familyId, fromInstant, now.plusNanos(1), null, null).events
        val byChild = events.groupBy { it.childId }

        return InsightResponse(familyId, from, to, zone.id, now, children.map { child ->
            val childEvents = byChild[child.id].orEmpty()
            val feedings = childEvents.filter { it.eventType == TimelineEventType.FEEDING }.sortedBy { it.occurredAt }
            val sleeps = childEvents.filter { it.eventType == TimelineEventType.SLEEP }
            val daily = (0 until days).map { index ->
                val date = from.plusDays(index.toLong())
                val start = date.atStartOfDay(zone).toInstant()
                val end = minOf(date.plusDays(1).atStartOfDay(zone).toInstant(), now)
                val records = childEvents.filter { it.occurredAt.atZone(zone).toLocalDate() == date }
                val dayFeedings = records.filter { it.eventType == TimelineEventType.FEEDING }
                DailyInsight(
                    date, dayFeedings.sumOf { it.amountMl ?: 0 }, dayFeedings.size,
                    sleeps.sumOf { overlapMinutes(it.occurredAt, it.endedAt ?: now, start, end) },
                    records.count { it.diaperType == DiaperType.PEE || it.diaperType == DiaperType.BOTH },
                    records.count { it.diaperType == DiaperType.POOP || it.diaperType == DiaperType.BOTH },
                )
            }
            val amounts = feedings.mapNotNull { it.amountMl }
            val intervals = feedings.zipWithNext { a, b -> Duration.between(a.occurredAt, b.occurredAt).toSeconds() / 60.0 }
            ChildInsight(
                child.id, child.name, child.birthOrder,
                daily.count { it.feedingCount > 0 || it.sleepMinutes > 0 || it.peeCount > 0 || it.poopCount > 0 },
                daily.sumOf { it.feedingTotalMl }.toDouble() / days,
                amounts.takeIf { it.isNotEmpty() }?.average(), amounts.minOrNull(), amounts.maxOrNull(),
                intervals.takeIf { it.isNotEmpty() }?.average(),
                daily.sumOf { it.sleepMinutes }.toDouble() / days,
                sleeps.maxOfOrNull { overlapMinutes(it.occurredAt, it.endedAt ?: now, fromInstant, now) },
                daily.sumOf { it.peeCount }.toDouble() / days,
                daily.sumOf { it.poopCount }.toDouble() / days,
                daily,
            )
        })
    }

    private fun overlapMinutes(start: Instant, end: Instant, from: Instant, to: Instant): Long =
        Duration.between(maxOf(start, from), minOf(end, to)).toMinutes().coerceAtLeast(0)
}
