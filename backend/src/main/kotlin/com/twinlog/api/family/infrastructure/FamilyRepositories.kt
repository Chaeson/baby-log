package com.twinlog.api.family.infrastructure

import com.twinlog.api.family.domain.ChildEntity
import com.twinlog.api.family.domain.FamilyEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface FamilyJpaRepository : JpaRepository<FamilyEntity, UUID>

interface ChildJpaRepository : JpaRepository<ChildEntity, UUID> {
    @Query(
        """
        select c from ChildEntity c
        where c.family.id = :familyId
        order by c.birthOrder asc, c.createdAt asc
        """,
    )
    fun findAllForFamily(@Param("familyId") familyId: UUID): List<ChildEntity>

    @Query(
        """
        select (count(c) > 0) from ChildEntity c
        where c.family.id = :familyId and c.birthOrder = :birthOrder
        """,
    )
    fun existsForFamilyAndBirthOrder(
        @Param("familyId") familyId: UUID,
        @Param("birthOrder") birthOrder: Int,
    ): Boolean
}

