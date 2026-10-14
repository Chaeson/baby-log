import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { VoiceRecordForm } from "../components/voice-record-form";
import { ApiError, request } from "@/lib/api";
import { mockDashboard } from "../mock-data";

vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), request: vi.fn() }));
beforeEach(() => { vi.mocked(request).mockReset(); });

it("requires confirmation and retains the same key when a save response is lost", async () => {
  const user = userEvent.setup(); const onSaved = vi.fn().mockResolvedValue(undefined);
  const event = { childId: mockDashboard.children[0].childId, type: "FEEDING", amountMl: 120 };
  vi.mocked(request).mockResolvedValueOnce({ events: [event] }).mockRejectedValueOnce(new ApiError("offline", 0)).mockResolvedValueOnce({ saved: true });
  render(<VoiceRecordForm transcript="첫째 분유 120" familyId="family" childSummaries={mockDashboard.children} onSaved={onSaved} />);
  expect(request).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "기록 내용 확인" }));
  expect(onSaved).not.toHaveBeenCalled();
  await user.click(await screen.findByRole("button", { name: "기록하기" }));
  const first = JSON.parse(vi.mocked(request).mock.calls[1][1]!.body as string);
  expect(screen.getByRole("textbox")).toBeDisabled();
  await user.click(await screen.findByRole("button", { name: "같은 요청 다시 확인" }));
  const retry = JSON.parse(vi.mocked(request).mock.calls[2][1]!.body as string);
  expect(retry).toEqual(first);
  expect(onSaved).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "기록하기" })).not.toBeInTheDocument();
});

it("failed parsing never saves any event", async () => {
  vi.mocked(request).mockRejectedValue(new ApiError("ambiguous", 400));
  render(<VoiceRecordForm transcript="분유 안 먹었어" familyId="family" childSummaries={mockDashboard.children} onSaved={vi.fn()} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "기록 내용 확인" }));
  expect(await screen.findByRole("status")).toHaveTextContent("아직 저장되지 않았어요");
  expect(screen.queryByRole("button", { name: "기록하기" })).not.toBeInTheDocument();
});
