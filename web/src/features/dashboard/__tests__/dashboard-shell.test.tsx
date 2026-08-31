import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { mockDashboard } from "@/features/dashboard/mock-data";

describe("DashboardShell", () => {
  it("shows twins side by side in one comparison table", () => {
    render(<DashboardShell initialData={mockDashboard} />);

    expect(screen.getByRole("columnheader", { name: /첫째/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /둘째/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "분유 620ml 580ml" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "수면 13시간 20분 14시간 10분" })).toBeInTheDocument();
  });

  it("records a preset feeding without leaving the dashboard", async () => {
    const user = userEvent.setup();
    render(<DashboardShell initialData={mockDashboard} />);

    await user.click(screen.getByRole("button", { name: "첫째 분유 기록" }));
    expect(screen.getByRole("heading", { name: "분유 얼마나 먹었나요?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "120ml 기록" }));

    expect(screen.queryByRole("heading", { name: "분유 얼마나 먹었나요?" })).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: "분유 740ml 580ml" })).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "둘째 소변 기록" }));
    expect(screen.getByText("둘째 소변을 기록했어요")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "둘째 수면 시작 기록" }));
    expect(screen.getByRole("button", { name: "둘째 깨어남 기록" })).toBeInTheDocument();
    expect(screen.getByText("둘째 수면을 시작했어요")).toBeInTheDocument();
  });
});
