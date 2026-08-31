package com.twinlog.api.common

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@ConfigurationProperties("twinlog.web")
data class WebClientProperties(
    var allowedOrigins: List<String> = listOf(
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ),
)

@Configuration(proxyBeanMethods = false)
class WebConfiguration(
    private val properties: WebClientProperties,
) : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOrigins(*properties.allowedOrigins.toTypedArray())
            .allowedMethods("GET", "POST", "OPTIONS")
            .allowedHeaders("*")
    }
}
