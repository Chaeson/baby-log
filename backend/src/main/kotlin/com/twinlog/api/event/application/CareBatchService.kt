package com.twinlog.api.event.application

import com.twinlog.api.auth.sha256
import com.twinlog.api.common.*
import com.twinlog.api.event.domain.DiaperType
import com.twinlog.api.event.infrastructure.SleepEventJpaRepository
import com.twinlog.api.family.application.FamilyService
import com.twinlog.api.family.infrastructure.FamilyJpaRepository
import jakarta.persistence.*
import jakarta.validation.Valid
import jakarta.validation.constraints.Size
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.Clock
import java.time.Instant
import java.util.UUID

enum class CareType { FEEDING, PEE, POOP, SLEEP_START, SLEEP_END }
data class CareCandidate(val childId: UUID, val type: CareType, val amountMl: Int? = null)
data class CareBatchRequest(val requestId: UUID, @field:Size(min = 1, max = 16) val events: List<CareCandidate>)
@Entity
@Table(name = "care_batches")
class CareBatch(
    @Id val id: UUID,
    @Column(name = "family_id", nullable = false) val familyId: UUID,
    @Column(name = "request_hash", length = 64, nullable = false) val requestHash: String,
    @Column(name = "created_at", nullable = false) val createdAt: Instant,
)
interface CareBatchRepository : JpaRepository<CareBatch, UUID>

@Service
class CareBatchService(
    private val familyService: FamilyService, private val families: FamilyJpaRepository,
    private val batches: CareBatchRepository, private val events: BabyEventService,
    private val sleeps: SleepEventJpaRepository, private val clock: Clock,
) {
    @Transactional
    fun save(familyId: UUID, request: CareBatchRequest): Map<String, Any> {
        val children = familyService.getChildren(familyId).map { it.id }.toSet()
        families.findForUpdate(familyId) ?: throw ResourceNotFoundException("Family not found")
        val hash = sha256(request.events.joinToString(";") { "${it.childId}:${it.type}:${it.amountMl}" })
        val existing = batches.findById(request.requestId).orElse(null)
        if (existing != null) {
            if (existing.familyId != familyId || existing.requestHash != hash) throw DomainConflictException("Request ID already used")
            return mapOf("requestId" to request.requestId, "saved" to true)
        }
        request.events.forEach {
            if (it.childId !in children) throw InvalidRequestException("Child is not in this family")
            if (it.type == CareType.FEEDING && it.amountMl !in 1..2000) throw InvalidRequestException("분유량을 확인해 주세요")
            if (it.type != CareType.FEEDING && it.amountMl != null) throw InvalidRequestException("Unexpected amount")
        }
        request.events.forEach {
            when (it.type) {
                CareType.FEEDING -> events.recordFeeding(RecordFeedingRequest(it.childId, requireNotNull(it.amountMl)))
                CareType.PEE, CareType.POOP -> events.recordDiaper(RecordDiaperRequest(it.childId, if (it.type == CareType.PEE) DiaperType.PEE else DiaperType.POOP))
                CareType.SLEEP_START -> events.startSleep(StartSleepRequest(it.childId))
                CareType.SLEEP_END -> {
                    val sleep = sleeps.findOpenForFamilyAt(familyId, clock.instant()).find { s -> s.child.id == it.childId }
                        ?: throw DomainConflictException("종료할 수면 기록이 없습니다")
                    events.endSleep(requireNotNull(sleep.id), null)
                }
            }
        }
        batches.save(CareBatch(request.requestId, familyId, hash, clock.instant()))
        return mapOf("requestId" to request.requestId, "saved" to true)
    }
}

@RestController
class CareBatchController(private val service: CareBatchService) {
    @PostMapping("/api/v1/families/{familyId}/care-batches")
    fun save(@PathVariable familyId: UUID, @Valid @RequestBody body: CareBatchRequest) = service.save(familyId, body)
}
