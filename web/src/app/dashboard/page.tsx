import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { mockDashboard } from "@/features/dashboard/mock-data";

export default function DashboardPage() {
  return <DashboardShell initialData={mockDashboard} />;
}

