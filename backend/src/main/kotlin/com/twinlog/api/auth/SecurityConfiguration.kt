package com.twinlog.api.auth

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.oauth2.core.*
import org.springframework.security.oauth2.jwt.*
import org.springframework.security.web.SecurityFilterChain

@Configuration(proxyBeanMethods = false)
class SecurityConfiguration(
    @Value("\${twinlog.auth.enabled:true}") private val enabled: Boolean,
    @Value("\${twinlog.auth.issuer:}") private val issuer: String,
    @Value("\${twinlog.auth.client-id:}") private val clientId: String,
    private val environment: org.springframework.core.env.Environment,
    private val decoders: org.springframework.beans.factory.ObjectProvider<JwtDecoder>,
) {
    @Bean
    fun security(http: HttpSecurity): SecurityFilterChain {
        check(enabled || environment.activeProfiles.any { it in setOf("local", "local-db") } || environment.getProperty("twinlog.test-mode") == "true") {
            "Authentication may only be disabled for local development or tests"
        }
        http.cors { }.csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it.requestMatchers("/actuator/health/**", "/api/v1/session/config").permitAll()
                if (enabled) it.anyRequest().authenticated() else it.anyRequest().permitAll()
            }
        if (enabled) {
            require(issuer.startsWith("https://") && clientId.isNotBlank()) { "Configure AUTH_ISSUER and AUTH_CLIENT_ID" }
            val decoder = decoders.ifAvailable ?: JwtDecoders.fromIssuerLocation<NimbusJwtDecoder>(issuer).also { decoder ->
                decoder.setJwtValidator(DelegatingOAuth2TokenValidator(
                    JwtValidators.createDefaultWithIssuer(issuer),
                    OAuth2TokenValidator<Jwt> { jwt ->
                        if (jwt.getClaimAsString("token_use") == "access" && jwt.getClaimAsString("client_id") == clientId)
                            OAuth2TokenValidatorResult.success()
                        else OAuth2TokenValidatorResult.failure(OAuth2Error("invalid_token"))
                    },
                ))
            }
            http.oauth2ResourceServer { it.jwt { jwt -> jwt.decoder(decoder) } }
        }
        http.addFilterAfter(ApiRateLimitFilter(), org.springframework.security.web.access.intercept.AuthorizationFilter::class.java)
        return http.build()
    }
}
