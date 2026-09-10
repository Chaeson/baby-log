"use client";

import { useState } from "react";
import { useWorkspace } from "@/components/workspace";
import { request } from "@/lib/api";

export default function SettingsPage() {
  const { family, dashboard, disconnect, refresh } = useWorkspace();
  const [name, setName] = useState("");
  const [order, setOrder] = useState(dashboard.children.length + 1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function addChild() {
    if (busy) return;
    setBusy(true); setMessage(null);
    let saved = false;
    try {
      await request(`/families/${family.id}/children`, { method: "POST", body: JSON.stringify({ name: name.trim(), birthOrder: order }) });
      saved = true; setName(""); setOrder(order + 1);
      await refresh(); setMessage("아이를 등록했어요.");
    } catch (cause) { setMessage(saved ? "아이 등록은 완료됐어요. 새로고침해 주세요." : cause instanceof Error ? cause.message : "등록에 실패했어요."); }
    finally { setBusy(false); }
  }
  return <main className="page space-y-5">
    <h1 className="text-3xl font-bold">설정</h1>
    <section className="panel space-y-3"><h2 className="text-lg font-bold">{family.name}</h2>
      <p className="text-sm text-ink-muted">가족 ID</p><code className="block break-all text-sm select-all">{family.id}</code>
      <p className="text-sm text-ink-muted">이 브라우저는 가족 연결만 기억해요. 육아 기록은 서버에서 불러옵니다.</p>
      <ul className="space-y-2">{dashboard.children.map((c) => <li key={c.childId}>{c.name}{c.nickname ? ` · ${c.nickname}` : ""}</li>)}</ul>
    </section>
    <form className="panel space-y-3" onSubmit={(e) => { e.preventDefault(); void addChild(); }}>
      <h2 className="font-bold">아이 추가</h2>
      <label className="block">이름<input className="field mt-2" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="block">태어난 순서<input type="number" className="field mt-2" min={1} max={8} required value={order} onChange={(e) => setOrder(Number(e.target.value))} /></label>
      <button className="action" disabled={busy || !name.trim()}>아이 등록</button>
    </form>
    {message && <p role="status" className="panel">{message}</p>}
    <section className="panel space-y-3"><h2 className="font-bold">가족 연결 해제</h2><p className="text-sm text-ink-muted">서버의 기록은 삭제되지 않아요. 다시 연결하려면 위 가족 ID가 필요해요.</p><button className="action" disabled={busy} onClick={disconnect}>이 브라우저에서 연결 해제</button></section>
  </main>;
}
