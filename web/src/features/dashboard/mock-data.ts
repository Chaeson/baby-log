import type { DashboardSnapshot } from "@/lib/dashboard";

export const mockDashboard: DashboardSnapshot = {
  date: "2026-08-31",
  generatedAt: "2026-08-31T12:00:00Z",
  familyName: "쌍둥이네",
  children: [
    {
      childId: "child-a",
      name: "첫째",
      nickname: "A",
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
      nickname: "B",
      accent: "sage",
      feeding: { totalMl: 580, count: 6 },
      diaper: { pee: 6, poop: 1 },
      sleep: {
        totalMinutes: 850,
        isSleeping: true,
        startedAt: "2026-08-31T11:18:00Z",
      },
      currentState: {
        lastFeeding: { amountMl: 90, occurredAt: "2026-08-31T11:05:00Z" },
        sleep: { status: "SLEEPING", since: "2026-08-31T11:18:00Z" },
        lastPeeAt: "2026-08-31T11:00:00Z",
        lastPoopAt: "2026-08-31T07:00:00Z",
      },
    },
  ],
};
