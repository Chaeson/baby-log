import type { ChildDashboard } from "@/lib/dashboard";
import { formatMinutes } from "@/lib/dashboard";

const accentDots = {
  apricot: "bg-[#e96b45]",
  sage: "bg-[#6c9483]",
  sky: "bg-[#588da8]",
  lilac: "bg-[#8d78a8]",
} as const;

type ComparisonTableProps = {
  summaries: ChildDashboard[];
};

export function ComparisonTable({ summaries }: ComparisonTableProps) {
  const rows = [
    {
      label: "분유",
      value: (child: ChildDashboard) => `${child.feeding.totalMl}ml`,
    },
    {
      label: "분유 횟수",
      value: (child: ChildDashboard) => `${child.feeding.count}회`,
    },
    {
      label: "소변",
      value: (child: ChildDashboard) => `${child.diaper.pee}회`,
    },
    {
      label: "대변",
      value: (child: ChildDashboard) => `${child.diaper.poop}회`,
    },
    {
      label: "수면",
      value: (child: ChildDashboard) => formatMinutes(child.sleep.totalMinutes),
    },
  ];

  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <table
        className="w-full table-fixed border-separate border-spacing-0 text-sm"
        style={{ minWidth: `${104 + summaries.length * 112}px` }}
      >
        <caption className="sr-only">아이별 오늘 육아 기록 비교</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 w-[104px] border-b border-line bg-surface px-3 py-3 text-left text-xs font-medium text-ink-muted"
            >
              기록
            </th>
            {summaries.map((child) => (
              <th
                key={child.childId}
                scope="col"
                className="border-b border-line px-2 py-3 text-center"
              >
                <span className="inline-flex items-center gap-2 text-base font-bold text-ink">
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${accentDots[child.accent]}`}
                  />
                  {child.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.label}>
              <th
                scope="row"
                className={`sticky left-0 z-10 bg-surface px-3 py-3.5 text-left font-medium text-ink-muted ${
                  index < rows.length - 1 ? "border-b border-line/70" : ""
                }`}
              >
                {row.label}
              </th>
              {summaries.map((child) => (
                <td
                  key={child.childId}
                  className={`px-2 py-3.5 text-center font-semibold tabular-nums text-ink ${
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
