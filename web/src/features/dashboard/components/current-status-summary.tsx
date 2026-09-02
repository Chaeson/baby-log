import type { ChildDashboard } from "@/lib/dashboard";
import { formatRelativeTime, formatStatusDuration } from "@/lib/dashboard";

type CurrentStatusSummaryProps = {
  summaries: ChildDashboard[];
  referenceAt: string;
};

export function CurrentStatusSummary({
  summaries,
  referenceAt,
}: CurrentStatusSummaryProps) {
  const rows = [
    {
      label: "마지막 분유",
      value: (child: ChildDashboard) => {
        const feeding = child.currentState.lastFeeding;
        return feeding
          ? `${formatRelativeTime(feeding.occurredAt, referenceAt)} · ${feeding.amountMl}ml`
          : "기록 없음";
      },
    },
    {
      label: "현재 수면",
      value: (child: ChildDashboard) =>
        formatStatusDuration(
          child.currentState.sleep.status,
          child.currentState.sleep.since,
          referenceAt,
        ),
    },
    {
      label: "마지막 소변",
      value: (child: ChildDashboard) =>
        formatRelativeTime(child.currentState.lastPeeAt, referenceAt),
    },
    {
      label: "마지막 대변",
      value: (child: ChildDashboard) =>
        formatRelativeTime(child.currentState.lastPoopAt, referenceAt),
    },
  ];

  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <table
        className="w-full table-fixed border-separate border-spacing-0 text-sm"
        style={summaries.length > 2 ? { minWidth: `${112 + summaries.length * 124}px` } : undefined}
      >
        <caption className="sr-only">아이별 현재 육아 상태</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 w-28 border-b border-line bg-surface px-3 py-3 text-left text-xs font-medium text-ink-muted"
            >
              상태
            </th>
            {summaries.map((child) => (
              <th
                key={child.childId}
                scope="col"
                className="border-b border-line px-2 py-3 text-center text-base font-extrabold text-ink"
              >
                {child.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.label}>
              <th
                scope="row"
                className={`sticky left-0 z-10 bg-surface px-3 py-3.5 text-left text-xs font-semibold text-ink-muted ${
                  index < rows.length - 1 ? "border-b border-line/70" : ""
                }`}
              >
                {row.label}
              </th>
              {summaries.map((child) => (
                <td
                  key={child.childId}
                  className={`px-2 py-3.5 text-center text-xs font-bold leading-5 tabular-nums text-ink sm:text-sm ${
                    index < rows.length - 1 ? "border-b border-line/70" : ""
                  }`}
                >
                  {row.value(child)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
