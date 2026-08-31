package com.twinlog.api.event.domain

import com.twinlog.api.family.domain.ChildEntity
import jakarta.persistence.Column
import jakarta.persistence.DiscriminatorColumn
import jakarta.persistence.DiscriminatorType
import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Inheritance
import jakarta.persistence.InheritanceType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.PreUpdate
import jakarta.persistence.PrimaryKeyJoinColumn
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "baby_events")
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "event_type", discriminatorType = DiscriminatorType.STRING, length = 30)
abstract class BabyEventEntity(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id", nullable = false)
    val child: ChildEntity,
    @Column(name = "occurred_at", nullable = false)
    val occurredAt: Instant,
    @Column(length = 1000)
    val memo: String? = null,
    @Column(name = "created_by_user_id")
    val createdByUserId: UUID? = null,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = createdAt,
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,
) {
    @PreUpdate
    fun touch() {
        updatedAt = Instant.now()
    }
}

@Entity
@Table(name = "feeding_events")
@PrimaryKeyJoinColumn(name = "baby_event_id")
@DiscriminatorValue("FEEDING")
class FeedingEventEntity(
    child: ChildEntity,
    occurredAt: Instant,
    @Column(name = "amount_ml", nullable = false)
    val amountMl: Int,
    memo: String? = null,
    createdByUserId: UUID? = null,
    createdAt: Instant,
) : BabyEventEntity(
    child = child,
    occurredAt = occurredAt,
    memo = memo,
    createdByUserId = createdByUserId,
    createdAt = createdAt,
)

enum class DiaperType {
    PEE,
    POOP,
    BOTH,
}

@Entity
@Table(name = "diaper_events")
@PrimaryKeyJoinColumn(name = "baby_event_id")
@DiscriminatorValue("DIAPER")
class DiaperEventEntity(
    child: ChildEntity,
    occurredAt: Instant,
    @Enumerated(EnumType.STRING)
    @Column(name = "diaper_type", nullable = false, length = 10)
    val diaperType: DiaperType,
    memo: String? = null,
    createdByUserId: UUID? = null,
    createdAt: Instant,
) : BabyEventEntity(
    child = child,
    occurredAt = occurredAt,
    memo = memo,
    createdByUserId = createdByUserId,
    createdAt = createdAt,
)

@Entity
@Table(name = "sleep_events")
@PrimaryKeyJoinColumn(name = "baby_event_id")
@DiscriminatorValue("SLEEP")
class SleepEventEntity(
    child: ChildEntity,
    startedAt: Instant,
    @Column(name = "ended_at")
    var endedAt: Instant? = null,
    memo: String? = null,
    createdByUserId: UUID? = null,
    createdAt: Instant,
) : BabyEventEntity(
    child = child,
    occurredAt = startedAt,
    memo = memo,
    createdByUserId = createdByUserId,
    createdAt = createdAt,
) {
    val startedAt: Instant
        get() = occurredAt

    fun end(at: Instant) {
        check(endedAt == null) { "Sleep event has already ended" }
        require(!at.isBefore(startedAt)) { "Sleep end cannot be before its start" }
        endedAt = at
        updatedAt = at
    }
}

