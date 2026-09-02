import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { mockDashboard } from "@/features/dashboard/mock-data";

describe("DashboardShell", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(mockDashboard.generatedAt));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the five product navigation destinations", () => {
    render(<DashboardShell initialData={mockDashboard} />);

    const navigation = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(navigation).toHaveTextContent("오늘");
    expect(navigation).toHaveTextContent("기록");
    expect(navigation).toHaveTextContent("인사이트");
    expect(navigation).toHaveTextContent("AI");
    expect(navigation).toHaveTextContent("설정");
    expect(navigation).not.toHaveTextContent("아이");
  });

  it("shows twins side by side in one comparison table", () => {
    render(<DashboardShell initialData={mockDashboard} />);

    expect(screen.getAllByRole("columnheader", { name: /첫째/ })).toHaveLength(2);
    expect(screen.getAllByRole("columnheader", { name: /둘째/ })).toHaveLength(2);
    expect(screen.getByRole("row", { name: "분유 620ml 580ml" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "수면 13시간 20분 14시간 10분" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "지금 상태" })).toBeInTheDocument();
  });

  it("records a preset feeding without leaving the dashboard", async () => {
    const user = userEvent.setup();
    render(<DashboardShell initialData={mockDashboard} />);

    await user.click(screen.getByRole("button", { name: "첫째 분유 기록" }));
    expect(screen.getByRole("heading", { name: "분유 얼마나 먹었나요?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "120ml 기록" }));

    expect(screen.queryByRole("heading", { name: "분유 얼마나 먹었나요?" })).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: "분유 740ml 580ml" })).toBeInTheDocument();
    expect(
      screen.getByRole("row", {
        name: "마지막 분유 방금 전 · 120ml 55분 전 · 90ml",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("첫째 분유 120ml를 기록했어요")).toBeInTheDocument();
  });

  it("validates and records a custom feeding amount", async () => {
    const user = userEvent.setup();
    render(<DashboardShell initialData={mockDashboard} />);

    await user.click(screen.getByRole("button", { name: "둘째 분유 기록" }));
    const saveButton = screen.getByRole("button", { name: "기록하기" });
    expect(saveButton).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "직접 분유량 입력" }), "110");
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    expect(screen.getByRole("row", { name: "분유 620ml 690ml" })).toBeInTheDocument();
  });

  it("records diaper and sleep actions on the selected child card", async () => {
    const user = userEvent.setup();
    render(<DashboardShell initialData={mockDashboard} />);

    await user.click(screen.getByRole("button", { name: "첫째 소변 기록" }));
    expect(screen.getByText("첫째 소변을 기록했어요")).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "마지막 소변 방금 전 1시간 전" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "첫째 수면 시작 기록" }));
    expect(screen.getByRole("button", { name: "첫째 깨어남 기록" })).toBeInTheDocument();
    expect(screen.getByText("첫째 수면을 시작했어요")).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "현재 수면 수면 중 0분 수면 중 42분" }),
    ).toBeInTheDocument();
  });
});
