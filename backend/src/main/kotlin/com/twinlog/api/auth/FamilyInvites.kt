package com.twinlog.api.auth

import com.twinlog.api.common.DomainConflictException
import com.twinlog.api.family.domain.*
import com.twinlog.api.family.infrastructure.FamilyJpaRepository
import jakarta.persistence.*
import org.springframework.data.jpa.repository.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Clock
import java.time.Instant
import java.util.*

fun sha256(value: String): String = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.toByteArray()))

@Entity
@Table(name = "family_invites")
class FamilyInvite(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "family_id", nullable = false) val familyId: UUID,
    @Column(name = "token_hash", nullable = false, unique = true, length = 64) val tokenHash: String,
    @Column(name = "expires_at", nullable = false) val expiresAt: Instant,
    @Column(name = "used_by") var usedBy: UUID? = null,
)

interface InviteRepository : JpaRepository<FamilyInvite, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    fun findByTokenHash(tokenHash: String): FamilyInvite?
}

@Service
class InviteService(
    private val access: FamilyAccess, private val invites: InviteRepository,
    private val members: MemberRepository, private val users: UserRepository,
    private val families: FamilyJpaRepository, private val clock: Clock,
    private val entityManager: EntityManager,
) {
    @Transactional
    fun create(familyId: UUID): Map<String, String> {
        access.requireOwner(familyId)
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(32).also(SecureRandom()::nextBytes))
        val expires = clock.instant().plusSeconds(86400)
        invites.save(FamilyInvite(familyId = familyId, tokenHash = sha256(token), expiresAt = expires))
        return mapOf("token" to token, "expiresAt" to expires.toString())
    }

    @Transactional
    fun accept(token: String): Map<String, UUID> {
        val userId = access.userId() ?: throw org.springframework.security.access.AccessDeniedException("Login required")
        val user = users.findById(userId).orElseThrow()
        entityManager.lock(user, LockModeType.PESSIMISTIC_WRITE)
        val invite = invites.findByTokenHash(sha256(token))
            ?: throw DomainConflictException("초대가 유효하지 않습니다")
        if (invite.usedBy == userId) return mapOf("familyId" to invite.familyId)
        if (invite.usedBy != null || !invite.expiresAt.isAfter(clock.instant()))
            throw DomainConflictException("초대가 만료되었거나 사용되었습니다")
        if (members.findAllByUserId(userId).isNotEmpty()) throw DomainConflictException("이미 가족에 연결되어 있습니다")
        members.save(FamilyMemberEntity(family = families.findById(invite.familyId).orElseThrow(), user = user, role = FamilyRole.PARENT))
        invite.usedBy = userId
        return mapOf("familyId" to invite.familyId)
    }
}

@RestController
class InviteController(private val service: InviteService) {
    @PostMapping("/api/v1/families/{familyId}/invites")
    fun create(@PathVariable familyId: UUID) = service.create(familyId)

    data class Accept(@field:jakarta.validation.constraints.Size(min = 43, max = 43) val token: String)
    @PostMapping("/api/v1/invites/accept")
    fun accept(@jakarta.validation.Valid @RequestBody body: Accept) = service.accept(body.token)
}
