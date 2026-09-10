"use client";

import { useCallback, useState } from "react";
import { useWorkspace } from "@/components/workspace";
import { loadInsights, type ChildInsight } from "@/lib/api";
import { formatMinutes } from "@/lib/dashboard";
import { useRemote } from "@/lib/use-remote";

type Category = "feeding" | "sleep" | "diaper" | "comparison";
const number = (value: number | null, unit: string) => value === null ? "기록 부족" : `${Math.round(value * 10) / 10}${unit}`;
const duration = (value: number | null) => value === null ? "기록 부족" : formatMinutes(value);
const metrics: { category: Category; label: string; value: (child: ChildInsight) => string }[] = [
  { category: "feeding", label: "하루 평균 분유량", value: (c) => number(c.averageDailyFeedingMl, "ml") },
  { category: "feeding", label: "평균 1회 수유량", value: (c) => number(c.averageFeedingMl, "ml") },
  { category: "feeding", label: "평균 수유 간격", value: (c) => duration(c.averageFeedingIntervalMinutes) },
  { category: "feeding", label: "최소 / 최대 수유량", value: (c) => `${number(c.minFeedingMl, "ml")} / ${number(c.maxFeedingMl, "ml")}` },
  { category: "sleep", label: "하루 평균 수면", value: (c) => duration(c.averageDailySleepMinutes) },
  { category: "sleep", label: "기간 내 최장 수면", value: (c) => duration(c.longestSleepMinutes) },
  { category: "diaper", label: "하루 평균 소변", value: (c) => number(c.averageDailyPeeCount, "회") },
  { category: "diaper", label: "하루 평균 대변", value: (c) => number(c.averageDailyPoopCount, "회") },
];

export function InsightsPage() {
  const { family } = useWorkspace();
  const [days, setDays] = useState(7);
  const [category, setCategory] = useState<Category>("comparison");
  const [revision, setRevision] = useState(0);
  const load = useCallback((signal: AbortSignal) => { void revision; return loadInsights(family.id, days, signal); }, [family.id, days, revision]);
  const { data, error, loading } = useRemote(load);
  return <main className="page space-y-5">
    <header className="flex items-center justify-between"><h1 className="text-3xl font-bold">인사이트</h1><button className="action" disabled={loading} onClick={() => setRevision(revision + 1)}>새로고침</button></header>
    <div className="flex gap-2">{[7, 30].map((value) => <button key={value} className={`action ${days === value ? "primary" : ""}`} aria-pressed={days === value} onClick={() => setDays(value)}>최근 {value}일</button>)}</div>
    <div className="flex flex-wrap gap-2" aria-label="인사이트 종류">{Object.entries({ feeding: "수유", sleep: "수면", diaper: "대소변", comparison: "아이별 비교" }).map(([value, label]) => <button key={value} className={`action ${category === value ? "primary" : ""}`} aria-pressed={category === value} onClick={() => setCategory(value as Category)}>{label}</button>)}</div>
    <p className="text-sm leading-6 text-ink-muted">기록이 없는 날도 0으로 포함한 {days}일 평균이에요. 오늘은 지금까지의 기록만 반영돼요. 기록 누락은 실제 생활 패턴과 다를 수 있어요.</p>
    {loading && <p role="status" className="panel">기록을 분석하고 있어요…</p>}
    {error && <p role="alert" className="panel text-accent-deep">{error}</p>}
    {data && <>
      <p className="text-sm text-ink-muted">{data.from} ~ {data.to} · 서울 시간</p>
      <div className="panel overflow-x-auto p-2"><table className="w-full text-sm"><caption className="sr-only">아이별 기록 통계</caption>
        <thead><tr><th className="p-3 text-left">지표</th>{data.children.map((c) => <th key={c.childId} className="min-w-28 p-3">{c.name}</th>)}</tr></thead>
        <tbody><tr className="border-t border-line"><th className="p-3 text-left font-medium">기록 있는 날</th>{data.children.map((c) => <td key={c.childId} className="p-3 text-center">{c.recordedDays}/{days}일</td>)}</tr>
          {metrics.filter((m) => category === "comparison" || category === m.category).map((m) => <tr key={m.label} className="border-t border-line"><th className="p-3 text-left font-medium">{m.label}</th>{data.children.map((c) => <td key={c.childId} className="p-3 text-center tabular-nums">{m.value(c)}</td>)}</tr>)}
        </tbody></table></div>
      <h2 className="text-lg font-bold">날짜별 변화</h2>
      <div className="space-y-3">{data.children[0]?.days.slice().reverse().map((day) => <section className="panel" key={day.date}><h3 className="mb-3 font-bold">{day.date}</h3><div className="grid grid-cols-2 gap-3">{data.children.map((c) => {
        const item = c.days.find((d) => d.date === day.date)!;
        return <div key={c.childId}><p className="mb-1 font-bold text-accent-deep">{c.name}</p>
          {(category === "comparison" || category === "feeding") && <p className="text-sm">분유 {item.feedingTotalMl}ml · {item.feedingCount}회</p>}
          {(category === "comparison" || category === "sleep") && <p className="text-sm">수면 {formatMinutes(item.sleepMinutes)}</p>}
          {(category === "comparison" || category === "diaper") && <p className="text-sm">소변 {item.peeCount}회 · 대변 {item.poopCount}회</p>}
        </div>;
      })}</div></section>)}</div>
      <p className="text-sm text-ink-muted">기록에 기반한 통계이며 건강 상태를 진단하지 않아요.</p>
    </>}
  </main>;
}
