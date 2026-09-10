"use client";

import { useCallback, useState } from "react";
import { useWorkspace } from "@/components/workspace";
import { loadTimeline, type TimelineEvent } from "@/lib/api";
import { dateRange, recordTime, seoulDate, shiftDate } from "@/lib/dates";
import { useRemote } from "@/lib/use-remote";

export type EventFilter = "ALL" | "FEEDING" | "SLEEP" | "PEE" | "POOP";
export function filterEvents(events: TimelineEvent[], childId: string, type: EventFilter) {
  return events.filter((event) => (childId === "ALL" || childId === event.childId) &&
    (type === "ALL" || event.eventType === type || (type === "PEE" || type === "POOP") && (event.diaperType === type || event.diaperType === "BOTH")));
}

export function RecordsPage() {
  const { family, dashboard } = useWorkspace();
  const [date, setDate] = useState(() => seoulDate());
  const [days, setDays] = useState(1);
  const [child, setChild] = useState("ALL");
  const [type, setType] = useState<EventFilter>("ALL");
  const [revision, setRevision] = useState(0);
  const range = dateRange(date, days);
  const load = useCallback((signal: AbortSignal) => {
    void revision;
    return loadTimeline(family.id, range.from, range.to, signal);
  }, [family.id, range.from, range.to, revision]);
  const { data, loading, error } = useRemote(load);
  const events = filterEvents(data?.events ?? [], child, type);
  const groups = events.reduce((result, event) => {
    const day = seoulDate(new Date(Math.max(Date.parse(event.occurredAt), Date.parse(range.from))));
    result.set(day, [...(result.get(day) ?? []), event]);
    return result;
  }, new Map<string, TimelineEvent[]>());

  return <main className="page space-y-5">
    <header className="flex items-center justify-between"><h1 className="text-3xl font-bold">기록</h1><button className="action" disabled={loading} onClick={() => setRevision(revision + 1)}>새로고침</button></header>
    <section className="panel space-y-4" aria-label="기록 필터">
      <div className="flex flex-wrap gap-2">
        {([['오늘', 1, 0], ['어제', 1, -1], ['최근 7일', 7, 0], ['최근 30일', 30, 0]] as const).map(([label, count, offset]) => <button key={label} type="button" className="action" onClick={() => { setDate(shiftDate(seoulDate(), offset)); setDays(count); }}>{label}</button>)}
      </div>
      <label className="block text-sm font-bold">날짜 선택<input aria-label="날짜 선택" type="date" value={date} max={seoulDate()} className="field mt-2" onChange={(e) => { if (e.target.value) { setDate(e.target.value); setDays(1); } }} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-bold">아이<select className="field mt-2" value={child} onChange={(e) => setChild(e.target.value)}><option value="ALL">전체 아이</option>{dashboard.children.map((item) => <option key={item.childId} value={item.childId}>{item.name}</option>)}</select></label>
        <label className="text-sm font-bold">기록 종류<select className="field mt-2" value={type} onChange={(e) => setType(e.target.value as EventFilter)}>{Object.entries({ ALL: "전체 기록", FEEDING: "분유", SLEEP: "수면", PEE: "소변", POOP: "대변" }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <p className="text-sm text-ink-muted">{shiftDate(date, 1 - days)} ~ {date} · 서울 시간 · {events.length}개 기록</p>
    </section>
    {loading && <p role="status" className="panel">기록을 불러오고 있어요…</p>}
    {error && <p role="alert" className="panel text-accent-deep">{error}</p>}
    {!loading && !error && events.length === 0 && <p className="panel text-ink-muted">선택한 기간과 조건에 기록이 없어요.</p>}
    {[...groups].map(([day, records]) => <section key={day} aria-label={`${day} 기록`}>
      <h2 className="mb-3 font-bold">{day}</h2>
      <ol className="space-y-3">{records.map((event) => <li key={event.id} className="panel flex gap-3">
        <div className="w-1 shrink-0 rounded-full bg-sage" aria-hidden="true" />
        <div><p className="font-bold">{event.childName} · {event.eventType === "FEEDING" ? `분유 ${event.amountMl}ml` : event.eventType === "SLEEP" ? "수면" : event.diaperType === "BOTH" ? "소변 · 대변" : event.diaperType === "PEE" ? "소변" : "대변"}</p>
          <p className="mt-1 text-sm text-ink-muted"><time dateTime={event.occurredAt}>{recordTime(event.occurredAt)}</time>{event.eventType === "SLEEP" && ` ~ ${event.endedAt ? recordTime(event.endedAt) : "수면 중"}`}</p>
          {event.memo && <p className="mt-2 whitespace-pre-wrap text-sm">{event.memo}</p>}
        </div>
      </li>)}</ol>
    </section>)}
  </main>;
}
