"use client";

import { useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/workspace";

export default function AiPage() {
  const { dashboard } = useWorkspace();
  const [childId, setChildId] = useState<string | null>(null);
  return <main className="page space-y-5"><h1 className="text-3xl font-bold">AI 도우미</h1>
    <div className="flex flex-wrap gap-2">{dashboard.children.map((c) => <button key={c.childId} className={`action ${childId === c.childId ? "primary" : ""}`} aria-pressed={childId === c.childId} onClick={() => setChildId(c.childId)}>{c.name} AI</button>)}<button className={`action ${childId === null ? "primary" : ""}`} aria-pressed={childId === null} onClick={() => setChildId(null)}>쌍둥이 AI</button></div>
    <section className="panel space-y-3"><h2 className="text-lg font-bold">AI 대화는 준비 중이에요</h2><p className="text-ink-muted">{childId ? "선택한 아이를 중심으로 형제·자매 기록도 함께 참고하는" : "두 아이의 기록을 함께 비교하는"} 대화를 준비하고 있어요. 현재는 기록 기반 통계를 먼저 확인할 수 있어요.</p><Link href="/insights" className="action">아이별 통계 보기</Link></section>
  </main>;
}
