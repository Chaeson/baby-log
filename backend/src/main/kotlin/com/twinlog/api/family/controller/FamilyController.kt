package com.twinlog.api.family.controller

import com.twinlog.api.family.application.ChildResponse
import com.twinlog.api.family.application.CreateChildRequest
import com.twinlog.api.family.application.CreateFamilyRequest
import com.twinlog.api.family.application.FamilyResponse
import com.twinlog.api.family.application.FamilyService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/families")
class FamilyController(
    private val familyService: FamilyService,
) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createFamily(@Valid @RequestBody request: CreateFamilyRequest): FamilyResponse =
        familyService.createFamily(request)

    @PostMapping("/{familyId}/children")
    @ResponseStatus(HttpStatus.CREATED)
    fun registerChild(
        @PathVariable familyId: UUID,
        @Valid @RequestBody request: CreateChildRequest,
    ): ChildResponse = familyService.registerChild(familyId, request)

    @GetMapping("/{familyId}/children")
    fun getChildren(@PathVariable familyId: UUID): List<ChildResponse> =
        familyService.getChildren(familyId)
}

