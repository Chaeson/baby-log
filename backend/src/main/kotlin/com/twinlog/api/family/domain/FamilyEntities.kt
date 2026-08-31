package com.twinlog.api.family.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "families")
class FamilyEntity(
    @Column(nullable = false, length = 100)
    var name: String,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
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
@Table(
    name = "children",
    uniqueConstraints = [UniqueConstraint(name = "uk_children_family_birth_order", columnNames = ["family_id", "birth_order"])],
)
class ChildEntity(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_id", nullable = false)
    val family: FamilyEntity,
    @Column(nullable = false, length = 100)
    var name: String,
    @Column(length = 100)
    var nickname: String? = null,
    @Column(name = "birth_order", nullable = false)
    val birthOrder: Int,
    @Column(name = "birth_date")
    val birthDate: LocalDate? = null,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
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
@Table(name = "users")
class UserEntity(
    @Column(nullable = false, unique = true, length = 320)
    val email: String,
    @Column(name = "display_name", nullable = false, length = 100)
    var displayName: String,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,
)

enum class FamilyRole {
    OWNER,
    PARENT,
    CAREGIVER,
}

@Entity
@Table(
    name = "family_members",
    uniqueConstraints = [UniqueConstraint(name = "uk_family_members_family_user", columnNames = ["family_id", "user_id"])],
)
class FamilyMemberEntity(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_id", nullable = false)
    val family: FamilyEntity,
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    val role: FamilyRole,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,
)

