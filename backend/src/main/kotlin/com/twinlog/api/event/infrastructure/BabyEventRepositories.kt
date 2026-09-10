package com.twinlog.api.event.infrastructure

import com.twinlog.api.event.domain.DiaperEventEntity
import com.twinlog.api.event.domain.DiaperType
import com.twinlog.api.event.domain.FeedingEventEntity
import com.twinlog.api.event.domain.SleepEventEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant
import java.util.UUID

interface FeedingEventJpaRepository : JpaRepository<FeedingEventEntity, UUID> {
    @Query(
        """
        select e from FeedingEventEntity e join fetch e.child c
        where c.family.id = :familyId and e.occurredAt <= :at
          and not exists (
            select newer.id from FeedingEventEntity newer
            where newer.child.id = c.id and newer.occurredAt <= :at
              and (
                newer.occurredAt > e.occurredAt
                or (newer.occurredAt = e.occurredAt and newer.createdAt > e.createdAt)
              )
          )
        """,
    )
    fun findLatestForFamilyAt(
        @Param("familyId") familyId: UUID,
        @Param("at") at: Instant,
    ): List<FeedingEventEntity>

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
        where c.family.id = :familyId and e.diaperType in :diaperTypes and e.occurredAt <= :at
          and not exists (
            select newer.id from DiaperEventEntity newer
            where newer.child.id = c.id and newer.diaperType in :diaperTypes and newer.occurredAt <= :at
              and (
                newer.occurredAt > e.occurredAt
                or (newer.occurredAt = e.occurredAt and newer.createdAt > e.createdAt)
              )
          )
        """,
    )
    fun findLatestForFamilyAndTypesAt(
        @Param("familyId") familyId: UUID,
        @Param("diaperTypes") diaperTypes: Collection<DiaperType>,
        @Param("at") at: Instant,
    ): List<DiaperEventEntity>

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
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from SleepEventEntity e where e.id = :id")
    fun findForUpdate(@Param("id") id: UUID): SleepEventEntity?

    @Query(
        """
        select e from SleepEventEntity e join fetch e.child c
        where c.family.id = :familyId and e.endedAt is null and e.occurredAt <= :at
        """,
    )
    fun findOpenForFamilyAt(
        @Param("familyId") familyId: UUID,
        @Param("at") at: Instant,
    ): List<SleepEventEntity>

    @Query(
        """
        select e from SleepEventEntity e join fetch e.child c
        where c.family.id = :familyId and e.endedAt is not null and e.endedAt <= :at
          and not exists (
            select newer.id from SleepEventEntity newer
            where newer.child.id = c.id and newer.endedAt is not null and newer.endedAt <= :at
              and (
                newer.endedAt > e.endedAt
                or (newer.endedAt = e.endedAt and newer.createdAt > e.createdAt)
              )
          )
        """,
    )
    fun findLatestEndedForFamilyAt(
        @Param("familyId") familyId: UUID,
        @Param("at") at: Instant,
    ): List<SleepEventEntity>

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
