import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); sessionStorage.clear(); history.replaceState(null, "", "/dashboard"); });
it("rejects a callback with the wrong state without sending its code", async () => {
  sessionStorage.setItem("twinlog:oauth:pending", JSON.stringify({ verifier: "secret", state: "expected", createdAt: Date.now() }));
  history.replaceState(null, "", "/dashboard?code=code&state=wrong");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const { finishLogin, authHeaders } = await import("./auth");
  await expect(finishLogin()).rejects.toThrow("로그인을 다시 시작");
  expect(fetcher).not.toHaveBeenCalled();
  expect(authHeaders()).toEqual({});
  expect(location.search).toBe("");
});
it("rejects an expired pending login", async () => {
  sessionStorage.setItem("twinlog:oauth:pending", JSON.stringify({ verifier: "secret", state: "state", createdAt: Date.now() - 601_000 }));
  history.replaceState(null, "", "/dashboard?code=code&state=state");
  const { finishLogin } = await import("./auth");
  await expect(finishLogin()).rejects.toThrow("로그인을 다시 시작");
});
