"use client";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { useWorkspace } from "@/components/workspace";
import { request, type CareCommand } from "@/lib/api";
import type { Candidate } from "@/features/dashboard/components/voice-record-form";

export default function DashboardPage() {
  const { family, dashboard, refresh } = useWorkspace();
  async function record(command: CareCommand) {
    let events: Candidate[];
    if (command.type === "SLEEP_END") {
      const child = dashboard.children.find(c => c.currentState.sleep.eventId === command.sleepId);
      if (!child) throw new Error("수면 상태를 새로고침해 주세요.");
      events = [{ childId: child.childId, type: "SLEEP_END" }];
    } else if (command.type === "DIAPER") {
      events = (command.diaperType === "BOTH" ? ["PEE", "POOP"] as const : [command.diaperType]).map(type => ({ childId: command.childId, type }));
    } else events = [command];
    return request(`/families/${family.id}/care-batches`, { method: "POST", body: JSON.stringify({ requestId: crypto.randomUUID(), events }) });
  }
  return <DashboardShell familyId={family.id} initialData={dashboard} onRecord={record} onRefresh={refresh} />;
}
