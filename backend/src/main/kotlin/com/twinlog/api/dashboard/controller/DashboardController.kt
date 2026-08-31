package com.twinlog.api.dashboard.controller

import com.twinlog.api.dashboard.application.DashboardService
import com.twinlog.api.dashboard.application.TodayDashboardResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/families/{familyId}/dashboard")
class DashboardController(
    private val dashboardService: DashboardService,
) {
    @GetMapping("/today")
    fun today(
        @PathVariable familyId: UUID,
        @RequestParam(defaultValue = "Asia/Seoul") zoneId: String,
    ): TodayDashboardResponse = dashboardService.today(familyId, zoneId)
}

