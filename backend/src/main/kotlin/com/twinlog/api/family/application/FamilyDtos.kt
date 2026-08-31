package com.twinlog.api.family.application

import com.twinlog.api.family.domain.ChildEntity
import com.twinlog.api.family.domain.FamilyEntity
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class CreateFamilyRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
)

data class FamilyResponse(
    val id: UUID,
    val name: String,
    val createdAt: Instant,
)

data class CreateChildRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    @field:Size(max = 100)
    val nickname: String? = null,
    @field:Min(1)
    val birthOrder: Int,
    val birthDate: LocalDate? = null,
)

data class ChildResponse(
    val id: UUID,
    val familyId: UUID,
    val name: String,
    val nickname: String?,
    val birthOrder: Int,
    val birthDate: LocalDate?,
    val createdAt: Instant,
)

fun FamilyEntity.toResponse() = FamilyResponse(
    id = requireNotNull(id),
    name = name,
    createdAt = createdAt,
)

fun ChildEntity.toResponse() = ChildResponse(
    id = requireNotNull(id),
    familyId = requireNotNull(family.id),
    name = name,
    nickname = nickname,
    birthOrder = birthOrder,
    birthDate = birthDate,
    createdAt = createdAt,
)

