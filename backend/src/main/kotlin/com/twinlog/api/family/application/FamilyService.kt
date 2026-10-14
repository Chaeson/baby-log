package com.twinlog.api.family.application

import com.twinlog.api.common.DomainConflictException
import com.twinlog.api.common.InvalidRequestException
import com.twinlog.api.common.ResourceNotFoundException
import com.twinlog.api.family.domain.ChildEntity
import com.twinlog.api.family.domain.FamilyEntity
import com.twinlog.api.family.infrastructure.ChildJpaRepository
import com.twinlog.api.family.infrastructure.FamilyJpaRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

@Service
class FamilyService(
    private val access: com.twinlog.api.auth.FamilyAccess,
    private val members: com.twinlog.api.auth.MemberRepository,
    private val users: com.twinlog.api.auth.UserRepository,
    private val familyRepository: FamilyJpaRepository,
    private val childRepository: ChildJpaRepository,
    private val clock: Clock,
) {
    @Transactional
    fun setup(request: SetupFamilyRequest): SetupFamilyResponse {
        if (request.children.map { it.birthOrder }.distinct().size != request.children.size) {
            throw InvalidRequestException("Birth orders must be unique")
        }
        val family = createFamily(CreateFamilyRequest(request.name))
        return SetupFamilyResponse(family, request.children.map { registerChild(family.id, it) })
    }

    @Transactional(readOnly = true)
    fun getFamily(familyId: UUID): FamilyResponse = findFamily(familyId).toResponse()

    @Transactional
    fun createFamily(request: CreateFamilyRequest): FamilyResponse {
        val user = access.userId()?.let { users.findById(it).orElseThrow() }
        if (user != null) {
            // Serialize setup and invite acceptance on the user, including across ECS tasks.
            entityManager.lock(user, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
            if (members.findAllByUserId(requireNotNull(user.id)).isNotEmpty())
                throw DomainConflictException("이미 연결된 가족이 있습니다")
        }
        val family = familyRepository.save(
            FamilyEntity(
                name = request.name.trim(),
                createdAt = clock.instant(),
            ),
        )
        if (user != null) members.save(com.twinlog.api.family.domain.FamilyMemberEntity(
            family = family, user = user, role = com.twinlog.api.family.domain.FamilyRole.OWNER,
        ))
        return family.toResponse()
    }

    @jakarta.persistence.PersistenceContext
    private lateinit var entityManager: jakarta.persistence.EntityManager

    @Transactional
    fun registerChild(familyId: UUID, request: CreateChildRequest): ChildResponse {
        access.requireMember(familyId)
        val family = familyRepository.findForUpdate(familyId)
            ?: throw ResourceNotFoundException("Family $familyId was not found")
        if (childRepository.existsForFamilyAndBirthOrder(familyId, request.birthOrder)) {
            throw DomainConflictException("Birth order ${request.birthOrder} already exists in this family")
        }

        return childRepository.save(
            ChildEntity(
                family = family,
                name = request.name.trim(),
                nickname = request.nickname?.trim()?.takeIf(String::isNotEmpty),
                birthOrder = request.birthOrder,
                birthDate = request.birthDate,
                createdAt = clock.instant(),
            ),
        ).toResponse()
    }

    @Transactional(readOnly = true)
    fun getChildren(familyId: UUID): List<ChildResponse> {
        findFamily(familyId)
        return childRepository.findAllForFamily(familyId).map(ChildEntity::toResponse)
    }

    @Transactional(readOnly = true)
    fun findFamily(familyId: UUID): FamilyEntity {
        access.requireMember(familyId)
        return familyRepository.findById(familyId)
            .orElseThrow { ResourceNotFoundException("Family $familyId was not found") }
    }
}
