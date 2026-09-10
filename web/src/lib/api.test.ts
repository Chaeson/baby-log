import { afterEach, describe, expect, it, vi } from "vitest";
import { loadWorkspace, recordCare, request, setupFamily } from "./api";
import { dateRange, seoulDate } from "./dates";

afterEach(() => vi.unstubAllGlobals());
describe("care API boundary", () => {
  it("maps server totals and open sleep ID without mock fallback", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: "family", name: "가족" }))
      .mockResolvedValueOnce(Response.json({ familyId: "family", date: "2026-09-07", generatedAt: "2026-09-07T12:00:00Z", children: [{ childId: "child", name: "첫째", birthOrder: 1, feedingTotalMl: 120, feedingCount: 1, peeCount: 0, poopCount: 0, sleepMinutes: 30, currentState: { lastFeeding: null, lastPeeAt: null, lastPoopAt: null, sleep: { status: "SLEEPING", since: "2026-09-07T11:30:00Z", eventId: "sleep" } } }] }));
    vi.stubGlobal("fetch", fetcher);
    const result = await loadWorkspace("family");
    expect(result.dashboard.children[0].feeding.totalMl).toBe(120);
    expect(result.dashboard.children[0].currentState.sleep.eventId).toBe("sleep");
    expect(result.dashboard.children[0].sleep.totalMinutes).toBe(30);
    expect(fetcher.mock.calls[0][1].cache).toBe("no-store");
  });
  it("posts care types with exact API contracts", async () => {
    const fetcher = vi.fn().mockImplementation(async () => Response.json({ id: "saved" })); vi.stubGlobal("fetch", fetcher);
    await recordCare({ type: "FEEDING", childId: "child", amountMl: 120 });
    expect(fetcher).toHaveBeenLastCalledWith(expect.stringContaining("/events/feedings"), expect.objectContaining({ method: "POST", body: JSON.stringify({ childId: "child", amountMl: 120 }) }));
    await recordCare({ type: "DIAPER", childId: "child", diaperType: "POOP" });
    expect(fetcher).toHaveBeenLastCalledWith(expect.stringContaining("/events/diapers"), expect.anything());
    await recordCare({ type: "SLEEP_START", childId: "child" });
    expect(fetcher).toHaveBeenLastCalledWith(expect.stringContaining("/events/sleeps/start"), expect.anything());
    await recordCare({ type: "SLEEP_END", sleepId: "sleep" });
    expect(fetcher).toHaveBeenLastCalledWith(expect.stringContaining("/events/sleeps/sleep/end"), expect.objectContaining({ body: "{}" }));
  });
  it("creates family and children in a single request", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ family: { id: "family" }, children: [] })); vi.stubGlobal("fetch", fetcher);
    await setupFamily("가족", [{ name: "첫째", birthOrder: 1 }]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("/families/setup"), expect.objectContaining({ method: "POST" }));
  });
  it("does not silently replace unavailable data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(request("/families/missing")).rejects.toMatchObject({ status: 503 });
  });
  it("reports uncertain writes and never retries POST automatically", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("network")); vi.stubGlobal("fetch", fetcher);
    await expect(recordCare({ type: "SLEEP_START", childId: "child" })).rejects.toThrow("다시 누르기 전에");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("builds Seoul date ranges across month boundaries", () => {
    expect(dateRange("2026-09-01", 1)).toEqual({ from: "2026-08-31T15:00:00.000Z", to: "2026-09-01T15:00:00.000Z" });
    expect(dateRange("2026-09-01", 7).from).toBe("2026-08-25T15:00:00.000Z");
    expect(seoulDate(new Date("2026-08-31T15:00:00Z"))).toBe("2026-09-01");
  });
});
