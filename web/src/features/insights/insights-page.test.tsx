import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InsightsPage } from "./insights-page";
import { loadInsights, type Insights } from "@/lib/api";
vi.mock("@/components/workspace", () => ({ useWorkspace: () => ({ family: { id: "family" } }) }));
vi.mock("@/lib/api", () => ({ loadInsights: vi.fn() }));
const stats: Insights = {
  from: "2026-09-01", to: "2026-09-07", generatedAt: "2026-09-07T12:00:00Z",
  children: [{ childId: "a", name: "첫째", birthOrder: 1, recordedDays: 1, averageDailyFeedingMl: 120, averageFeedingMl: 120, minFeedingMl: 100, maxFeedingMl: 140, averageFeedingIntervalMinutes: 180, averageDailySleepMinutes: 90, longestSleepMinutes: 90, averageDailyPeeCount: 3, averageDailyPoopCount: 1, days: [{ date: "2026-09-07", feedingTotalMl: 120, feedingCount: 1, sleepMinutes: 90, peeCount: 3, poopCount: 1 }] }],
};
describe("InsightsPage", () => {
  it("shows real comparisons and switches metrics and date range", async () => {
    vi.mocked(loadInsights).mockResolvedValue(stats);
    render(<InsightsPage />);
    expect(await screen.findByRole("table", { name: "아이별 기록 통계" })).toHaveTextContent("하루 평균 분유량");
    expect(screen.getByRole("table")).toHaveTextContent("3시간");
    expect(screen.getByText("분유 120ml · 1회")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "수면" }));
    expect(screen.getByRole("table")).toHaveTextContent("기간 내 최장 수면");
    expect(screen.getByRole("table")).not.toHaveTextContent("하루 평균 분유량");
    await user.click(screen.getByRole("button", { name: "수유" }));
    expect(screen.getByRole("table")).toHaveTextContent("평균 수유 간격");
    await user.click(screen.getByRole("button", { name: "대소변" }));
    expect(screen.getByText("소변 3회 · 대변 1회")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "최근 30일" }));
    await waitFor(() => expect(loadInsights).toHaveBeenCalledWith("family", 30, expect.any(AbortSignal)));
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "새로고침" }));
    await waitFor(() => expect(loadInsights).toHaveBeenCalledTimes(3));
  });
  it("distinguishes missing measurements from recorded zero", async () => {
    const empty = structuredClone(stats);
    Object.assign(empty.children[0], { averageFeedingMl: null, minFeedingMl: null, maxFeedingMl: null, averageFeedingIntervalMinutes: null, longestSleepMinutes: null });
    vi.mocked(loadInsights).mockResolvedValue(empty);
    render(<InsightsPage />);
    expect(await screen.findByRole("table")).toHaveTextContent("기록 부족");
  });
  it("surfaces request failures without displaying sample insights", async () => {
    vi.mocked(loadInsights).mockRejectedValue(new Error("통계 연결 실패"));
    render(<InsightsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("통계 연결 실패");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
