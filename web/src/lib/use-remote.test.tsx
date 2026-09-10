import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useRemote } from "./use-remote";
it("discards a slow response after the selected date query changes", async () => {
  let finish!: (value: string) => void;
  const oldQuery = vi.fn((signal: AbortSignal) => { void signal; return new Promise<string>((resolve) => { finish = resolve; }); });
  const nextQuery = vi.fn(async () => "new-date");
  const { result, rerender } = renderHook(({ load }) => useRemote(load), { initialProps: { load: oldQuery as (signal: AbortSignal) => Promise<string> } });
  expect(result.current.loading).toBe(true);
  rerender({ load: nextQuery });
  await waitFor(() => expect(result.current.data).toBe("new-date"));
  await act(async () => finish("old-date"));
  expect(result.current.data).toBe("new-date");
  expect(oldQuery.mock.calls[0][0].aborted).toBe(true);
});
