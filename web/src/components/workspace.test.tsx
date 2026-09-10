import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceProvider, useWorkspace } from "./workspace";
import { ApiError, FAMILY_STORAGE_KEY, loadWorkspace, setupFamily, recordCare } from "@/lib/api";
import DashboardPage from "@/app/dashboard/page";
import { mockDashboard } from "@/features/dashboard/mock-data";
vi.mock("@/lib/api", async (original) => ({ ...await original<typeof import("@/lib/api")>(), loadWorkspace: vi.fn(), setupFamily: vi.fn(), recordCare: vi.fn() }));
const id = "12345678-1234-1234-1234-123456789012";
const workspace = { family: { id, name: "연결된 가족" }, dashboard: mockDashboard };
function Consumer() {
  const { family, refresh, disconnect } = useWorkspace();
  return <><p>{family.name}</p><button onClick={() => void refresh()}>갱신</button><button onClick={disconnect}>연결 해제</button></>;
}
beforeEach(() => { localStorage.clear(); vi.mocked(loadWorkspace).mockReset().mockResolvedValue(workspace); vi.mocked(setupFamily).mockReset(); });
describe("family workspace", () => {
  it("updates both dashboard tables after saving and manually refreshing without navigation", async () => {
    localStorage.setItem(FAMILY_STORAGE_KEY, id);
    vi.mocked(recordCare).mockResolvedValue({ id: "saved-event" });
    render(<WorkspaceProvider><DashboardPage /></WorkspaceProvider>);
    await screen.findByRole("row", { name: "분유 620ml 580ml" });
    await waitFor(() => expect(loadWorkspace).toHaveBeenCalledTimes(2));
    const updated = structuredClone(workspace);
    updated.dashboard.children[0].feeding.totalMl = 740;
    updated.dashboard.children[0].currentState.lastFeeding = { amountMl: 120, occurredAt: new Date().toISOString() };
    vi.mocked(loadWorkspace).mockResolvedValue(updated);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "첫째 분유 기록" }));
    await user.click(screen.getByRole("button", { name: "120ml 기록" }));
    expect(await screen.findByRole("row", { name: "분유 740ml 580ml" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /마지막 분유.*120ml/ })).toBeInTheDocument();
    const latest = structuredClone(updated);
    latest.dashboard.children[0].feeding.totalMl = 890;
    latest.dashboard.children[0].currentState.lastFeeding!.amountMl = 150;
    vi.mocked(loadWorkspace).mockResolvedValue(latest);
    await user.click(screen.getByRole("button", { name: "새로고침" }));
    expect(await screen.findByRole("row", { name: "분유 890ml 580ml" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /마지막 분유.*150ml/ })).toBeInTheDocument();
  });
  it("creates nothing automatically, then registers twins atomically", async () => {
    vi.mocked(setupFamily).mockResolvedValue({ family: workspace.family, children: [] });
    render(<WorkspaceProvider><Consumer /></WorkspaceProvider>);
    const submit = await screen.findByRole("button", { name: "가족 등록하고 시작" });
    expect(setupFamily).not.toHaveBeenCalled();
    await userEvent.setup().click(submit);
    expect(await screen.findByText("연결된 가족")).toBeInTheDocument();
    expect(setupFamily).toHaveBeenCalledWith("우리 가족", [{ name: "첫째", birthOrder: 1 }, { name: "둘째", birthOrder: 2 }]);
    expect(localStorage.getItem(FAMILY_STORAGE_KEY)).toBe(id);
  });
  it("restores a family, refreshes it and disconnects without deleting records", async () => {
    localStorage.setItem(FAMILY_STORAGE_KEY, id);
    render(<WorkspaceProvider><Consumer /></WorkspaceProvider>);
    expect(await screen.findByText("연결된 가족")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "갱신" }));
    await waitFor(() => expect(loadWorkspace).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole("button", { name: "연결 해제" }));
    expect(await screen.findByText("우리 가족의 첫 기록")).toBeInTheDocument();
    expect(localStorage.getItem(FAMILY_STORAGE_KEY)).toBeNull();
    expect(setupFamily).not.toHaveBeenCalled();
  });
  it("can connect an existing family without creating another", async () => {
    render(<WorkspaceProvider><Consumer /></WorkspaceProvider>);
    const input = await screen.findByRole("textbox", { name: "가족 ID" });
    const user = userEvent.setup(); await user.type(input, id);
    await user.click(screen.getByRole("button", { name: "기존 가족 연결" }));
    expect(await screen.findByText("연결된 가족")).toBeInTheDocument();
    expect(setupFamily).not.toHaveBeenCalled();
  });
  it("shows registration errors and supports one or more children", async () => {
    vi.mocked(setupFamily).mockRejectedValue(new Error("등록 오류"));
    render(<WorkspaceProvider><Consumer /></WorkspaceProvider>);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "아이 추가" }));
    await user.type(screen.getByRole("textbox", { name: "3번째 아이 이름" }), "셋째");
    await user.click(screen.getByRole("button", { name: "마지막 아이 제외" }));
    await user.click(screen.getByRole("button", { name: "가족 등록하고 시작" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("등록 오류");
  });
  it("keeps the newly created family ID when a follow-up read fails", async () => {
    vi.mocked(setupFamily).mockResolvedValue({ family: workspace.family, children: [] });
    vi.mocked(loadWorkspace).mockRejectedValueOnce(new ApiError("연결 오류", 0));
    render(<WorkspaceProvider><Consumer /></WorkspaceProvider>);
    await userEvent.setup().click(await screen.findByRole("button", { name: "가족 등록하고 시작" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("연결 오류");
    expect(screen.getByRole("textbox", { name: "가족 ID" })).toHaveValue(id);
    expect(localStorage.getItem(FAMILY_STORAGE_KEY)).toBe(id);
    await userEvent.setup().click(screen.getByRole("button", { name: "기존 가족 연결" }));
    expect(await screen.findByText("연결된 가족")).toBeInTheDocument();
    expect(setupFamily).toHaveBeenCalledTimes(1);
  });
  it("does not restore a disconnected family from a delayed refresh", async () => {
    localStorage.setItem(FAMILY_STORAGE_KEY, id);
    render(<WorkspaceProvider><Consumer /></WorkspaceProvider>);
    await screen.findByText("연결된 가족");
    let finish!: (value: typeof workspace) => void;
    vi.mocked(loadWorkspace).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await userEvent.setup().click(screen.getByRole("button", { name: "갱신" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "연결 해제" }));
    await act(async () => finish(workspace));
    expect(screen.queryByText("연결된 가족")).not.toBeInTheDocument();
  });
});
