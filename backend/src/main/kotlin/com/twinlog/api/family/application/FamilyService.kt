package com.twinlog.api.family.application

import com.twinlog.api.common.DomainConflictException
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
    private val familyRepository: FamilyJpaRepository,
    private val childRepository: ChildJpaRepository,
    private val clock: Clock,
) {
    @Transactional
    fun createFamily(request: CreateFamilyRequest): FamilyResponse =
        familyRepository.save(
            FamilyEntity(
                name = request.name.trim(),
                createdAt = clock.instant(),
            ),
        ).toResponse()

    @Transactional
    fun registerChild(familyId: UUID, request: CreateChildRequest): ChildResponse {
        val family = findFamily(familyId)
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
    fun findFamily(familyId: UUID): FamilyEntity =
        familyRepository.findById(familyId)
            .orElseThrow { ResourceNotFoundException("Family $familyId was not found") }
}

