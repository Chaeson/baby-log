package com.twinlog.api.voice.application

import com.twinlog.api.common.InvalidRequestException
import com.twinlog.api.event.application.CareType
import org.junit.jupiter.api.Test
import java.util.UUID
import kotlin.test.*

class VoiceCommandParserTest {
    private val parser = VoiceCommandParser()
    private val children = mapOf(1 to UUID.randomUUID(), 2 to UUID.randomUUID())
    @Test fun `mixed twin command produces four exact events`() {
        val events = parser.parse("첫째 120 먹고 둘째 90 먹었고 둘 다 응가했어", children)
        assertEquals(listOf(CareType.FEEDING, CareType.FEEDING, CareType.POOP, CareType.POOP), events.map { it.type })
        assertEquals(listOf(120, 90, null, null), events.map { it.amountMl })
        assertEquals(listOf(children[1], children[2], children[1], children[2]), events.map { it.childId })
    }
    @Test fun `ambiguity negation and unhandled time never silently become records`() {
        listOf("분유 120", "첫째 분유 120 안 먹었어", "첫째 어제 분유 120", "첫째 분유 0", "둘 다 응가 안 했어", "첫째 분유 120 그리고 이상한 말").forEach {
            assertFailsWith<InvalidRequestException>(it) { parser.parse(it, children) }
        }
    }
    @Test fun `sleep and urine commands are supported`() {
        assertEquals(CareType.SLEEP_START, parser.parse("첫째 잠들었어", children).single().type)
        assertEquals(CareType.SLEEP_END, parser.parse("둘째 일어났어", children).single().type)
        assertEquals(2, parser.parse("둘 다 소변", children).size)
    }
}
