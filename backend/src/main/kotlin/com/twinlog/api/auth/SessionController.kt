package com.twinlog.api.auth

import com.twinlog.api.family.domain.UserEntity
import org.springframework.web.bind.annotation.*
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.dao.DataIntegrityViolationException

@RestController
@RequestMapping("/api/v1/session")
class SessionController(private val access: FamilyAccess, private val users: UserRepository, private val members: MemberRepository, transactionManager: PlatformTransactionManager) {
    private val transaction = TransactionTemplate(transactionManager)
    @GetMapping("/config")
    fun config() = mapOf("authenticationRequired" to access.enabled)

    @PostMapping
    fun initialize(): Map<String, Any?> {
        val subject = access.subject() ?: return mapOf("userId" to null, "familyId" to null)
        // Do not infer identity from an unverified email supplied by the browser.
        try {
            transaction.execute {
                users.findByAuthSubject(subject) ?: users.saveAndFlush(UserEntity(
                    authSubject = subject, email = "$subject@identity.twinlog.invalid", displayName = "보호자",
                ))
            }
        } catch (exception: DataIntegrityViolationException) {
            // Another tab may have initialized this subject concurrently. The failed
            // transaction has ended before reading the winner's committed row.
            if (users.findByAuthSubject(subject) == null) throw exception
        }
        return requireNotNull(transaction.execute {
            val user = requireNotNull(users.findByAuthSubject(subject))
            mapOf("userId" to user.id, "familyId" to members.findAllByUserId(requireNotNull(user.id)).firstOrNull()?.family?.id)
        })
    }
}
