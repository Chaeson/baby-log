package com.twinlog.api.voice.application

import com.twinlog.api.common.InvalidRequestException
import com.twinlog.api.event.application.*
import com.twinlog.api.family.application.FamilyService
import jakarta.validation.Valid
import jakarta.validation.constraints.Size
import org.springframework.stereotype.Component
import org.springframework.web.bind.annotation.*
import java.util.UUID

@Component
class VoiceCommandParser {
    fun parse(text: String, children: Map<Int, UUID>): List<CareCandidate> {
        val input = text.trim().replace(Regex("[,.!?。]"), " ").trim()
        val targets = Regex("첫째|둘째|둘\\s*다").findAll(input).toList()
        if (targets.isEmpty() || targets.first().range.first != 0) fail()
        val result = targets.flatMapIndexed { index, target ->
            val ids = when (target.value.replace(" ", "")) {
                "첫째" -> listOf(children[1] ?: fail())
                "둘째" -> listOf(children[2] ?: fail())
                else -> listOf(children[1] ?: fail(), children[2] ?: fail())
            }
            val phrase = input.substring(target.range.last + 1, targets.getOrNull(index + 1)?.range?.first ?: input.length)
                .trim().replace(Regex("^(?:는|가|도)\\s*"), "").trim()
            val feeding = Regex("(?:분유\\s*)?(\\d{1,4})\\s*(?:ml|밀리|미리)?\\s*(?:먹었어|먹었고|먹고|먹음|먹었어요)?", RegexOption.IGNORE_CASE).matchEntire(phrase)
            val type = when {
                feeding != null -> CareType.FEEDING
                Regex("(?:응가|대변)(?:\\s*(?:했어|했어요|했음|했고))?").matches(phrase) -> CareType.POOP
                Regex("(?:소변|쉬)(?:\\s*(?:했어|했어요|했음|했고))?").matches(phrase) -> CareType.PEE
                phrase in listOf("잠들었어", "잠들었어요", "잠들었고", "수면 시작") -> CareType.SLEEP_START
                phrase in listOf("일어났어", "일어났어요", "깼어", "수면 종료") -> CareType.SLEEP_END
                else -> fail()
            }
            val amount = feeding?.groupValues?.get(1)?.toInt()
            if (amount != null && amount !in 1..2000) fail()
            ids.map { CareCandidate(it, type, amount) }
        }
        if (result.size !in 1..16) fail()
        return result
    }

    private fun fail(): Nothing = throw InvalidRequestException("아이와 기록 내용을 확인해 주세요. 예: 첫째 분유 120, 둘째 응가")
}

@RestController
class VoiceCommandController(private val families: FamilyService, private val parser: VoiceCommandParser) {
    data class ParseRequest(@field:Size(min = 1, max = 500) val text: String)
    @PostMapping("/api/v1/families/{familyId}/voice/parse")
    fun parse(@PathVariable familyId: UUID, @Valid @RequestBody body: ParseRequest): Map<String, List<CareCandidate>> {
        val children = families.getChildren(familyId).associate { it.birthOrder to it.id }
        return mapOf("events" to parser.parse(body.text, children))
    }
}
