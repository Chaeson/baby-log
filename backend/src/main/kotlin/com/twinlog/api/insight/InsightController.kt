package com.twinlog.api.insight

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/families/{familyId}/insights")
class InsightController(private val insightService: InsightService) {
    @GetMapping
    fun insights(
        @PathVariable familyId: UUID,
        @RequestParam(defaultValue = "7") days: Int,
        @RequestParam(defaultValue = "Asia/Seoul") zoneId: String,
    ): InsightResponse = insightService.summarize(familyId, days, zoneId)
}
