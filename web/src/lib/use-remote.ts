"use client";

import { useEffect, useState } from "react";

// A result is rendered only for the query that produced it. Aborted/older queries cannot replace it.
export function useRemote<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ load: typeof load; data?: T; error?: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ load, data }); },
      (cause) => { if (!controller.signal.aborted) setState({ load, error: cause instanceof Error ? cause.message : "기록을 불러오지 못했어요." }); },
    );
    return () => controller.abort();
  }, [load]);
  return state?.load === load ? { data: state.data, error: state.error, loading: false } : { data: undefined, error: undefined, loading: true };
}
