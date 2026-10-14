"use client";

import { useRef, useState } from "react";
import { ApiError, request } from "@/lib/api";
import type { ChildDashboard } from "@/lib/dashboard";

export type Candidate = { childId: string; type: "FEEDING" | "PEE" | "POOP" | "SLEEP_START" | "SLEEP_END"; amountMl?: number | null };
const labels = { FEEDING: "분유", PEE: "소변", POOP: "대변", SLEEP_START: "수면 시작", SLEEP_END: "깨어남" };

export function VoiceRecordForm({ transcript, familyId, childSummaries, onSaved, onPending }: {
  transcript: string; familyId: string; childSummaries: ChildDashboard[]; onSaved: () => Promise<void>; onPending?: (pending: boolean) => void;
}) {
  const [text, setText] = useState(transcript);
  const [events, setEvents] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const attempt = useRef<{ requestId: string; events: Candidate[] } | null>(null);
  async function parse() {
    if (lock.current || uncertain) return;
    lock.current = true; setBusy(true); setMessage(""); setEvents([]);
    try {
      const result = await request<{ events: Candidate[] }>(`/families/${familyId}/voice/parse`, { method: "POST", body: JSON.stringify({ text }) });
      setEvents(result.events); attempt.current = null;
    } catch { setMessage("문장을 확인해 주세요. 예: 첫째 분유 120, 둘째 응가. 아직 저장되지 않았어요."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save() {
    if (lock.current || saved) return;
    lock.current = true; setBusy(true); setMessage(""); onPending?.(true);
    attempt.current ??= { requestId: crypto.randomUUID(), events };
    let committed = false;
    try {
      await request(`/families/${familyId}/care-batches`, { method: "POST", body: JSON.stringify(attempt.current) });
      committed = true; setSaved(true); setUncertain(false); onPending?.(false);
      await onSaved(); setMessage("기록을 저장했어요.");
    } catch (error) {
      if (committed) setMessage("저장됐어요. Dashboard를 새로고침해 주세요.");
      else {
        const unknown = !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
        setUncertain(unknown);
        onPending?.(unknown);
        if (!unknown) attempt.current = null;
        setMessage(unknown ? "저장 결과 확인이 필요해요. 같은 요청 다시 확인을 눌러도 중복 저장되지 않아요." : "저장되지 않았어요. 아이의 현재 수면 상태와 입력값을 확인해 주세요.");
      }
    } finally { lock.current = false; setBusy(false); }
  }
  return <section className="mt-4 space-y-3 text-left">
    <label className="block text-sm font-bold">인식 문장 수정<textarea className="field mt-2" value={text} maxLength={500} disabled={busy || saved || uncertain} onChange={e => { setText(e.target.value); setEvents([]); attempt.current = null; }} /></label>
    {!saved && !uncertain && <button type="button" className="action w-full" disabled={busy || !text.trim()} onClick={() => void parse()}>기록 내용 확인</button>}
    {events.map((event, index) => <div className="rounded-xl border border-line p-3" key={index}>
      <p className="font-bold">{childSummaries.find(child => child.childId === event.childId)?.name} · {labels[event.type]}</p>
      {event.type === "FEEDING" && <label className="block text-sm">분유량 (ml)<input aria-label={`${index + 1}번째 분유량`} type="number" min={1} max={2000} className="field mt-1" value={event.amountMl ?? ""} disabled={busy || saved || uncertain} onChange={e => { setEvents(events.map((item, i) => i === index ? { ...item, amountMl: Number(e.target.value) } : item)); attempt.current = null; }} /></label>}
    </div>)}
    {events.length > 0 && !saved && <button type="button" className="action primary w-full" disabled={busy || events.some(event => event.type === "FEEDING" && (!event.amountMl || event.amountMl < 1 || event.amountMl > 2000))} onClick={() => void save()}>{busy ? "처리 중…" : uncertain ? "같은 요청 다시 확인" : "기록하기"}</button>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
