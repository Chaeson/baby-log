package com.twinlog.api.auth

import com.twinlog.api.family.domain.*
import com.twinlog.api.family.infrastructure.*
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.stereotype.Service
import java.util.UUID

interface MemberRepository : JpaRepository<FamilyMemberEntity, UUID> {
    fun existsByFamilyIdAndUserId(familyId: UUID, userId: UUID): Boolean
    fun findAllByUserId(userId: UUID): List<FamilyMemberEntity>
    fun findByFamilyIdAndUserId(familyId: UUID, userId: UUID): FamilyMemberEntity?
}

interface UserRepository : JpaRepository<UserEntity, UUID> {
    fun findByAuthSubject(authSubject: UUID): UserEntity?
}

@Service
class FamilyAccess(
    private val members: MemberRepository,
    private val users: UserRepository,
    @Value("\${twinlog.auth.enabled:true}") val enabled: Boolean,
) {
    // Cognito sub is a UUID. Never accept a user ID from a request body.
    fun subject(): UUID? = if (!enabled) null else
        (SecurityContextHolder.getContext().authentication?.principal as? Jwt)?.subject?.let(UUID::fromString)
            ?: throw AccessDeniedException("Login required")

    fun userId(): UUID? = if (!enabled) null else users.findByAuthSubject(requireNotNull(subject()))?.id
        ?: throw AccessDeniedException("Initialize session first")

    fun requireMember(familyId: UUID) {
        if (enabled && !members.existsByFamilyIdAndUserId(familyId, requireNotNull(userId())))
            throw AccessDeniedException("Family access denied")
    }

    fun requireOwner(familyId: UUID) {
        if (!enabled || members.findByFamilyIdAndUserId(familyId, requireNotNull(userId()))?.role != FamilyRole.OWNER)
            throw AccessDeniedException("Family owner required")
    }
}
