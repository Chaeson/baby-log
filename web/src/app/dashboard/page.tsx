"use client";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { useWorkspace } from "@/components/workspace";
import { recordCare } from "@/lib/api";

export default function DashboardPage() {
  const { dashboard, refresh } = useWorkspace();
  return <DashboardShell initialData={dashboard} onRecord={recordCare} onRefresh={refresh} />;
}
