package com.twinlog.api.auth

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter

// Per-task protection; a shared edge limiter is required when scaling beyond the pilot.
class ApiRateLimitFilter : OncePerRequestFilter() {
    private data class Window(val minute: Long, var requests: Int)
    private val windows = HashMap<String, Window>()
    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        if (!request.requestURI.startsWith("/api/v1/") || request.method == "OPTIONS") { chain.doFilter(request, response); return }
        val voice = request.requestURI == "/api/v1/voice/transcriptions"
        val principal = SecurityContextHolder.getContext().authentication?.name ?: request.remoteAddr
        val key = "$principal:$voice"
        val minute = System.currentTimeMillis() / 60_000
        val allowed = synchronized(windows) {
            windows.entries.removeIf { it.value.minute != minute }
            if (!windows.containsKey(key) && windows.size >= 10_000) false
            else ++windows.getOrPut(key) { Window(minute, 0) }.requests <= if (voice) 10 else 120
        }
        if (!allowed) { response.status = 429; response.setHeader("Retry-After", "60"); return }
        chain.doFilter(request, response)
    }
}
