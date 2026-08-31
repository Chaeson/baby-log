import { Baby, Droplets, Milk, MoonStar, Sun } from "lucide-react";
import type { ChildDashboard, DiaperKind } from "@/lib/dashboard";
import { formatElapsed } from "@/lib/dashboard";

const accentStyles = {
  apricot: {
    panel: "bg-[#fff3eb] dark:bg-[#3a2923]",
    mark: "bg-[#e96b45] text-white",
    ring: "focus-visible:ring-[#e96b45]",
  },
  sage: {
    panel: "bg-[#edf5f0] dark:bg-[#22342d]",
    mark: "bg-[#6c9483] text-white",
    ring: "focus-visible:ring-[#6c9483]",
  },
  sky: {
    panel: "bg-[#edf5f8] dark:bg-[#23323a]",
    mark: "bg-[#588da8] text-white",
    ring: "focus-visible:ring-[#588da8]",
  },
  lilac: {
    panel: "bg-[#f3eff8] dark:bg-[#30283a]",
    mark: "bg-[#8d78a8] text-white",
    ring: "focus-visible:ring-[#8d78a8]",
  },
} as const;

type ChildCardProps = {
  child: ChildDashboard;
  clockNow: number;
  onFeeding: (childId: string) => void;
  onDiaper: (childId: string, kind: DiaperKind) => void;
  onSleep: (childId: string) => void;
};

export function ChildCard({
  child,
  clockNow,
  onFeeding,
  onDiaper,
  onSleep,
}: ChildCardProps) {
  const accent = accentStyles[child.accent];
  const startedAt = child.sleep.startedAt
    ? Date.parse(child.sleep.startedAt)
    : clockNow;
  const elapsedSeconds = child.sleep.isSleeping
    ? Math.max(0, Math.floor((clockNow - startedAt) / 1000))
    : 0;
  const actionClass = `flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-line/80 bg-surface-strong px-1.5 py-2 text-xs font-semibold text-ink shadow-sm transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${accent.ring}`;

  return (
    <article
      className={`rounded-[1.75rem] border border-white/60 p-4 surface-shadow dark:border-white/5 ${accent.panel}`}
      data-testid={`child-card-${child.childId}`}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-11 place-items-center rounded-2xl ${accent.mark}`}
            aria-hidden="true"
          >
            <Baby className="size-5" strokeWidth={2.2} />
          </span>
          <div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-lg font-extrabold tracking-[-0.02em] text-ink">
                {child.name}
              </h3>
              {child.nickname ? (
                <span className="text-xs font-medium text-ink-muted">
                  {child.nickname}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs font-medium text-ink-muted">
              분유 {child.feeding.totalMl}ml · {child.feeding.count}회
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              child.sleep.isSleeping
                ? "bg-[#243b32] text-[#d9f4e8] dark:bg-[#b4d6c7] dark:text-[#183026]"
                : "bg-white/75 text-ink-muted dark:bg-white/10"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                child.sleep.isSleeping ? "animate-pulse bg-current" : "bg-current/50"
              }`}
            />
            {child.sleep.isSleeping ? "수면 중" : "깨어있음"}
          </span>
          {child.sleep.isSleeping ? (
            <p className="mt-1.5 font-mono text-xs font-bold tabular-nums text-ink">
              {formatElapsed(elapsedSeconds)}
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2" aria-label={`${child.name} 빠른 기록`}>
        <button
          type="button"
          className={actionClass}
          onClick={() => onFeeding(child.childId)}
          aria-label={`${child.name} 분유 기록`}
        >
          <Milk className="size-5 text-accent-deep" aria-hidden="true" />
          분유
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() => onDiaper(child.childId, "pee")}
          aria-label={`${child.name} 소변 기록`}
        >
          <Droplets className="size-5 text-[#467f9a]" aria-hidden="true" />
          소변
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() => onDiaper(child.childId, "poop")}
          aria-label={`${child.name} 대변 기록`}
        >
          <span className="grid size-5 place-items-center text-base" aria-hidden="true">
            ●
          </span>
          대변
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() => onSleep(child.childId)}
          aria-label={`${child.name} ${child.sleep.isSleeping ? "깨어남" : "수면 시작"} 기록`}
        >
          {child.sleep.isSleeping ? (
            <Sun className="size-5 text-[#d5782f]" aria-hidden="true" />
          ) : (
            <MoonStar className="size-5 text-[#6f65a1]" aria-hidden="true" />
          )}
          {child.sleep.isSleeping ? "깨어남" : "잠들기"}
        </button>
      </div>
    </article>
  );
}
