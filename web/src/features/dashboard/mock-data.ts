import type { DashboardSnapshot } from "@/lib/dashboard";

export const mockDashboard: DashboardSnapshot = {
  date: "2026-08-31",
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
    },
    {
      childId: "child-b",
      name: "둘째",
      nickname: "B",
      accent: "sage",
      feeding: { totalMl: 580, count: 6 },
      diaper: { pee: 6, poop: 1 },
      sleep: { totalMinutes: 850, isSleeping: false },
    },
  ],
};

