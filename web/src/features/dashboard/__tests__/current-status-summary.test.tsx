import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CurrentStatusSummary } from "@/features/dashboard/components/current-status-summary";
import type { ChildDashboard } from "@/lib/dashboard";

const generatedAt = "2026-08-31T12:00:00Z";

const children: ChildDashboard[] = [
  {
    childId: "child-a",
    name: "첫째",
    accent: "apricot",
    feeding: { totalMl: 620, count: 6 },
    diaper: { pee: 7, poop: 2 },
    sleep: { totalMinutes: 800, isSleeping: false },
    currentState: {
      lastFeeding: { amountMl: 110, occurredAt: "2026-08-31T10:40:00Z" },
      sleep: { status: "AWAKE", since: "2026-08-31T10:55:00Z" },
      lastPeeAt: "2026-08-31T11:20:00Z",
      lastPoopAt: "2026-08-31T04:00:00Z",
    },
  },
  {
    childId: "child-b",
    name: "둘째",
    accent: "sage",
    feeding: { totalMl: 580, count: 6 },
    diaper: { pee: 6, poop: 1 },
    sleep: { totalMinutes: 850, isSleeping: true, startedAt: "2026-08-31T11:18:00Z" },
    currentState: {
      sleep: { status: "SLEEPING", since: "2026-08-31T11:18:00Z" },
    },
  },
];

describe("CurrentStatusSummary", () => {
  it("shows both twins' current care state without switching tabs", () => {
    render(<CurrentStatusSummary summaries={children} generatedAt={generatedAt} />);

    expect(screen.getByRole("columnheader", { name: "첫째" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "둘째" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "마지막 분유 1시간 20분 전 · 110ml 기록 없음" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "현재 수면 깨어있는 지 1시간 5분 수면 중 42분" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "마지막 소변 40분 전 기록 없음" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "마지막 대변 8시간 전 기록 없음" })).toBeInTheDocument();
  });
});
