import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecordsPage, filterEvents } from "./records-page";
import { loadTimeline, type TimelineEvent } from "@/lib/api";
vi.mock("@/components/workspace", () => ({ useWorkspace: () => ({ family: { id: "family" }, dashboard: { children: [{ childId: "a", name: "첫째" }, { childId: "b", name: "둘째" }] } }) }));
vi.mock("@/lib/api", () => ({ loadTimeline: vi.fn() }));
const event = (id: string, childId: string, type: TimelineEvent["eventType"], diaperType: TimelineEvent["diaperType"] = null): TimelineEvent => ({ id, childId, childName: childId === "a" ? "첫째" : "둘째", eventType: type, diaperType, occurredAt: "2026-09-07T05:00:00Z", amountMl: type === "FEEDING" ? 120 : null, startedAt: null, endedAt: null, memo: null });
describe("date timeline", () => {
  it("includes BOTH in both diaper filters and keeps child isolation", () => {
    const events = [event("1", "a", "DIAPER", "BOTH"), event("2", "b", "DIAPER", "PEE"), event("3", "a", "FEEDING")];
    expect(filterEvents(events, "a", "PEE").map((e) => e.id)).toEqual(["1"]);
    expect(filterEvents(events, "ALL", "POOP").map((e) => e.id)).toEqual(["1"]);
    expect(filterEvents(events, "ALL", "FEEDING").map((e) => e.id)).toEqual(["3"]);
  });
  it("loads dates and filters server records on screen", async () => {
    vi.mocked(loadTimeline).mockResolvedValue({ familyId: "family", from: "2026-09-06T15:00:00Z", to: "2026-09-07T15:00:00Z", events: [event("1", "a", "FEEDING"), event("2", "b", "DIAPER", "POOP")] });
    render(<RecordsPage />);
    expect(await screen.findByText("첫째 · 분유 120ml")).toBeInTheDocument();
    await userEvent.setup().selectOptions(screen.getByRole("combobox", { name: "아이" }), "b");
    expect(screen.queryByText("첫째 · 분유 120ml")).not.toBeInTheDocument();
    expect(screen.getByText("둘째 · 대변")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "최근 7일" }));
    await waitFor(() => expect(loadTimeline).toHaveBeenCalledTimes(2));
  });
});
