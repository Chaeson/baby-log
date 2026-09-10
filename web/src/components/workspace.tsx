"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, FAMILY_STORAGE_KEY, loadWorkspace, setupFamily, type Family } from "@/lib/api";
import type { DashboardSnapshot } from "@/lib/dashboard";

type Workspace = {
  family: Family;
  dashboard: DashboardSnapshot;
  refresh: () => Promise<void>;
  disconnect: () => void;
};
const Context = createContext<Workspace | null>(null);
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace must be connected");
  return value;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadWorkspace>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const familyIdRef = useRef<string | null>(null);
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);

  const connect = useCallback(async (familyId: string) => {
    const version = ++revision.current;
    familyIdRef.current = familyId;
    setError(null);
    try {
      const workspace = await loadWorkspace(familyId);
      if (version !== revision.current) return;
      setData(workspace);
      try { localStorage.setItem(FAMILY_STORAGE_KEY, familyId); } catch {
        setError("브라우저가 가족 연결을 기억하지 못해요. 설정에서 가족 ID를 보관해 주세요.");
      }
    } catch (cause) {
      if (version !== revision.current) return;
      setError(cause instanceof Error ? cause.message : "가족 연결에 실패했어요.");
      if (cause instanceof ApiError && cause.status === 404) setData(null);
    } finally {
      if (version === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      let id: string | null = null;
      try { id = localStorage.getItem(FAMILY_STORAGE_KEY); } catch { /* Session-only use remains available. */ }
      if (id) void connect(id);
      else setLoading(false);
    });
    return () => { active = false; invalidate(); };
  }, [connect, invalidate]);

  const refresh = useCallback(async () => {
    const id = familyIdRef.current;
    if (!id) return;
    const version = ++revision.current;
    const workspace = await loadWorkspace(id);
    if (version === revision.current) { setData(workspace); setError(null); }
  }, []);

  function disconnect() {
    revision.current++;
    familyIdRef.current = null;
    setData(null); setError(null); setLoading(false);
    try { localStorage.removeItem(FAMILY_STORAGE_KEY); } catch { /* No server data is removed. */ }
  }

  if (loading && !data) return <main className="page"><p role="status" className="panel">가족 기록을 불러오고 있어요…</p></main>;
  if (!data) return <Onboarding error={error} connect={connect} />;
  return <Context.Provider value={{ ...data, refresh, disconnect }}>
    {error && <p role="alert" className="mx-auto max-w-2xl px-4 pt-3 text-sm text-accent-deep">{error}</p>}
    {children}
  </Context.Provider>;
}

function Onboarding({ error, connect }: { error: string | null; connect: (id: string) => Promise<void> }) {
  const [name, setName] = useState("우리 가족");
  const [names, setNames] = useState(["첫째", "둘째"]);
  const [existingId, setExistingId] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [localError, setLocalError] = useState<string | null>(null);
  async function submit(create: boolean) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setLocalError(null);
    try {
      const id = create ? (await setupFamily(name.trim(), names.map((value, index) => ({ name: value.trim(), birthOrder: index + 1 })))).family.id : existingId.trim();
      // Remember a successful setup before the subsequent read, so a failed read never requires creating it again.
      setExistingId(id);
      try { localStorage.setItem(FAMILY_STORAGE_KEY, id); } catch { /* ID stays visible for manual recovery. */ }
      await connect(id);
    } catch (cause) { setLocalError(cause instanceof Error ? cause.message : "등록에 실패했어요."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <main className="page space-y-5">
    <header><p className="text-sm font-bold text-accent-deep">TWINLOG</p><h1 className="mt-2 text-3xl font-bold">우리 가족의 첫 기록</h1><p className="mt-3 text-ink-muted">아이들을 등록하면 오늘 상태와 기록을 한눈에 볼 수 있어요.</p></header>
    {(localError || error) && <p role="alert" className="panel text-accent-deep">{localError || error}</p>}
    <form className="panel space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(true); }}>
      <label className="block">가족 이름<input className="field mt-2" value={name} maxLength={100} required onChange={(e) => setName(e.target.value)} /></label>
      {names.map((value, index) => <label className="block" key={index}>{index + 1}번째 아이 이름<input className="field mt-2" value={value} required maxLength={100} onChange={(e) => setNames(names.map((name, i) => i === index ? e.target.value : name))} /></label>)}
      <div className="flex flex-wrap gap-2"><button className="action" type="button" disabled={names.length >= 8 || busy} onClick={() => setNames([...names, ""])}>아이 추가</button><button className="action" type="button" disabled={names.length <= 1 || busy} onClick={() => setNames(names.slice(0, -1))}>마지막 아이 제외</button></div>
      <button className="action primary w-full" disabled={busy || !name.trim() || names.some((name) => !name.trim())}>{busy ? "연결 중…" : "가족 등록하고 시작"}</button>
    </form>
    <form className="panel space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(false); }}>
      <h2 className="font-bold">등록한 가족이 있나요?</h2><label className="block text-sm">가족 ID<input className="field mt-2" value={existingId} required pattern="[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}" onChange={(e) => setExistingId(e.target.value)} /></label>
      <button className="action w-full" disabled={busy}>기존 가족 연결</button>
    </form>
  </main>;
}
