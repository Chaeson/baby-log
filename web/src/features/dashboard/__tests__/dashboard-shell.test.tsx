import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { mockDashboard } from "@/features/dashboard/mock-data";

describe("DashboardShell API workflow", () => {
  const onRecord = vi.fn();
  const onRefresh = vi.fn();

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(mockDashboard.generatedAt));
    onRecord.mockReset().mockResolvedValue({ id: "event-id" });
    onRefresh.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  const mount = () => render(<DashboardShell initialData={mockDashboard} onRecord={onRecord} onRefresh={onRefresh} />);

  it("compares twins without switching child tabs", () => {
    mount();
    expect(screen.getAllByRole("columnheader", { name: /첫째/ })).toHaveLength(2);
    expect(screen.getByRole("row", { name: "분유 620ml 580ml" })).toBeInTheDocument();
    expect(screen.queryByText("MOCK")).not.toBeInTheDocument();
  });

  it("saves via API and replaces totals only with the refreshed server snapshot", async () => {
    const user = userEvent.setup();
    const view = mount();
    await user.click(screen.getByRole("button", { name: "첫째 분유 기록" }));
    await user.click(screen.getByRole("button", { name: "120ml 기록" }));
    expect(onRecord).toHaveBeenCalledWith({ type: "FEEDING", childId: "child-a", amountMl: 120 });
    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("row", { name: "분유 620ml 580ml" })).toBeInTheDocument();
    const refreshed = structuredClone(mockDashboard);
    refreshed.children[0].feeding.totalMl = 740;
    view.rerender(<DashboardShell initialData={refreshed} onRecord={onRecord} onRefresh={onRefresh} />);
    expect(screen.getByRole("row", { name: "분유 740ml 580ml" })).toBeInTheDocument();
    expect(screen.getByText("첫째 분유 120ml를 기록했어요")).toBeInTheDocument();
  });

  it("validates custom amounts and records the intended child", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: "둘째 분유 기록" }));
    expect(screen.getByRole("button", { name: "기록하기" })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "직접 분유량 입력" }), "110");
    await user.click(screen.getByRole("button", { name: "기록하기" }));
    expect(onRecord).toHaveBeenCalledWith({ type: "FEEDING", childId: "child-b", amountMl: 110 });
  });

  it("disables repeated taps while saving", async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    onRecord.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    mount();
    await user.click(screen.getByRole("button", { name: "첫째 소변 기록" }));
    expect(screen.getByRole("button", { name: "첫째 소변 기록" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "첫째 소변 기록" }));
    expect(onRecord).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "첫째 소변 기록" })).toBeEnabled());
  });

  it("never shows a successful record when saving failed", async () => {
    onRecord.mockRejectedValue(new Error("연결 실패"));
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: "첫째 대변 기록" }));
    expect(screen.getByRole("alert")).toHaveTextContent("연결 실패");
    expect(screen.queryByText("첫째 대변을 기록했어요")).not.toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "첫째 대변 기록" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "새로고침" }));
    expect(screen.getByRole("button", { name: "첫째 대변 기록" })).toBeEnabled();
  });

  it("distinguishes a saved record from a failed refresh", async () => {
    onRefresh.mockRejectedValue(new Error("조회 실패"));
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: "첫째 소변 기록" }));
    expect(screen.getByRole("alert")).toHaveTextContent("기록은 저장됐어요");
    expect(onRecord).toHaveBeenCalledTimes(1);
  });

  it("ends sleep using its server event ID", async () => {
    const data = structuredClone(mockDashboard);
    data.children[1].currentState.sleep.eventId = "sleep-from-server";
    render(<DashboardShell initialData={data} onRecord={onRecord} onRefresh={onRefresh} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "둘째 깨어남 기록" }));
    expect(onRecord).toHaveBeenCalledWith({ type: "SLEEP_END", sleepId: "sleep-from-server" });
  });

  it("refreshes on return to a visible tab and coalesces overlapping focus events", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const view = mount();
    expect(onRefresh).not.toHaveBeenCalled();
    let finish!: () => void;
    onRefresh.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    fireEvent(window, new Event("focus"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    fireEvent(window, new Event("focus"));
    expect(onRefresh).toHaveBeenCalledTimes(2);
    view.unmount();
    fireEvent(document, new Event("visibilitychange"));
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
});
