package com.twinlog.api.event.infrastructure

import com.twinlog.api.event.domain.DiaperEventEntity
import com.twinlog.api.event.domain.FeedingEventEntity
import com.twinlog.api.event.domain.SleepEventEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant
import java.util.UUID

interface FeedingEventJpaRepository : JpaRepository<FeedingEventEntity, UUID> {
    @Query(
        """
        select e from FeedingEventEntity e join fetch e.child c
        where c.family.id = :familyId and e.occurredAt >= :from and e.occurredAt < :to
        """,
    )
    fun findAllForFamilyBetween(
        @Param("familyId") familyId: UUID,
        @Param("from") from: Instant,
        @Param("to") to: Instant,
    ): List<FeedingEventEntity>
}

interface DiaperEventJpaRepository : JpaRepository<DiaperEventEntity, UUID> {
    @Query(
        """
        select e from DiaperEventEntity e join fetch e.child c
        where c.family.id = :familyId and e.occurredAt >= :from and e.occurredAt < :to
        """,
    )
    fun findAllForFamilyBetween(
        @Param("familyId") familyId: UUID,
        @Param("from") from: Instant,
        @Param("to") to: Instant,
    ): List<DiaperEventEntity>
}

interface SleepEventJpaRepository : JpaRepository<SleepEventEntity, UUID> {
    @Query(
        """
        select e from SleepEventEntity e join fetch e.child c
        where c.family.id = :familyId
          and e.occurredAt < :to
          and (e.endedAt is null or e.endedAt > :from)
        """,
    )
    fun findAllOverlapping(
        @Param("familyId") familyId: UUID,
        @Param("from") from: Instant,
        @Param("to") to: Instant,
    ): List<SleepEventEntity>

    @Query(
        """
        select (count(e) > 0) from SleepEventEntity e
        where e.child.id = :childId and e.endedAt is null
        """,
    )
    fun existsOpenForChild(@Param("childId") childId: UUID): Boolean
}

