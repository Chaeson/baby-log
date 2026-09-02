"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  History,
  LayoutDashboard,
  Mic,
  Settings,
  Users,
} from "lucide-react";
import type { DashboardSnapshot, DiaperKind } from "@/lib/dashboard";
import { formatKoreanDate } from "@/lib/dashboard";
import { ChildCard } from "./child-card";
import { ComparisonTable } from "./comparison-table";
import { CurrentStatusSummary } from "./current-status-summary";
import { FeedingSheet } from "./feeding-sheet";
import { VoiceSheet } from "./voice-sheet";

const LAST_CHILD_STORAGE_KEY = "twinlog:last-child:v1";

type DashboardShellProps = {
  initialData: DashboardSnapshot;
};

export function DashboardShell({ initialData }: DashboardShellProps) {
  const [children, setChildren] = useState(initialData.children);
  const [feedingChildId, setFeedingChildId] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSleepingChild = children.some((child) => child.sleep.isSleeping);
  const feedingChild = children.find((child) => child.childId === feedingChildId);

  useEffect(() => {
    if (!hasSleepingChild) return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasSleepingChild]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  function rememberChild(childId: string) {
    try {
      window.localStorage.setItem(LAST_CHILD_STORAGE_KEY, childId);
    } catch {
      // Private browsing or storage restrictions should not block a record.
    }
  }

  function recordFeeding(amountMl: number) {
    if (!feedingChild) return;
    const target = feedingChild;
    setChildren((current) =>
      current.map((child) =>
        child.childId === target.childId
          ? {
              ...child,
              feeding: {
                totalMl: child.feeding.totalMl + amountMl,
                count: child.feeding.count + 1,
              },
            }
          : child,
      ),
    );
    rememberChild(target.childId);
    setFeedingChildId(null);
    showToast(`${target.name} 분유 ${amountMl}ml를 기록했어요`);
  }

  function recordDiaper(childId: string, kind: DiaperKind) {
    const target = children.find((child) => child.childId === childId);
    if (!target) return;
    setChildren((current) =>
      current.map((child) =>
        child.childId === childId
          ? {
              ...child,
              diaper: {
                ...child.diaper,
                [kind]: child.diaper[kind] + 1,
              },
            }
          : child,
      ),
    );
    rememberChild(childId);
    showToast(`${target.name} ${kind === "pee" ? "소변" : "대변"}을 기록했어요`);
  }

  function toggleSleep(childId: string) {
    const target = children.find((child) => child.childId === childId);
    if (!target) return;
    const actionAt = Date.now();
    const message = target.sleep.isSleeping
      ? `${target.name} 깨어남을 기록했어요`
      : `${target.name} 수면을 시작했어요`;
    setChildren((current) =>
      current.map((child) => {
        if (child.childId !== childId) return child;
        if (child.sleep.isSleeping) {
          const startedAt = child.sleep.startedAt
            ? Date.parse(child.sleep.startedAt)
            : actionAt;
          const elapsedMinutes = Math.max(1, Math.floor((actionAt - startedAt) / 60_000));
          return {
            ...child,
            sleep: {
              totalMinutes: child.sleep.totalMinutes + elapsedMinutes,
              isSleeping: false,
            },
          };
        }
        return {
          ...child,
          sleep: {
            ...child.sleep,
            isSleeping: true,
            startedAt: new Date(actionAt).toISOString(),
          },
        };
      }),
    );
    setClockNow(actionAt);
    rememberChild(childId);
    showToast(message);
  }

  return (
    <div className="dashboard-shell min-h-dvh pb-28 text-ink">
      <main className="mx-auto w-full max-w-2xl px-4 pb-8 pt-5 sm:px-6 sm:pt-8">
        <header className="reveal flex items-start justify-between gap-4 px-1">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-extrabold tracking-[0.16em] text-accent-deep">
                TWINLOG
              </span>
              <span className="rounded-full border border-line bg-surface/75 px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                MOCK
              </span>
            </div>
            <h1 className="font-display text-[2rem] leading-none tracking-[-0.04em] text-ink">
              오늘의 리듬
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-ink-muted">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatKoreanDate(initialData.date)} · {initialData.familyName}
            </p>
          </div>
          <button
            type="button"
            disabled
            className="relative grid size-11 cursor-not-allowed place-items-center rounded-2xl border border-line bg-surface/85 text-ink shadow-sm opacity-80"
            aria-label="알림 — 준비 중"
          >
            <Bell className="size-5" aria-hidden="true" />
            <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-accent" />
          </button>
        </header>

        <section className="reveal reveal-delay-1 mt-7" aria-labelledby="current-status-title">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.14em] text-accent-deep">
                RIGHT NOW
              </p>
              <h2 id="current-status-title" className="mt-0.5 text-lg font-extrabold tracking-[-0.02em]">
                지금 상태
              </h2>
            </div>
            <p className="text-xs text-ink-muted">마지막 기록 기준</p>
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-surface p-2 surface-shadow dark:border-white/5">
            <CurrentStatusSummary
              children={children}
              generatedAt={initialData.generatedAt}
            />
          </div>
        </section>

        <section className="reveal reveal-delay-2 mt-8" aria-labelledby="today-summary-title">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.14em] text-sage-deep">
                SIDE BY SIDE
              </p>
              <h2 id="today-summary-title" className="mt-0.5 text-lg font-extrabold tracking-[-0.02em]">
                오늘 한눈에 비교
              </h2>
            </div>
            <p className="text-xs text-ink-muted">자정부터 지금까지</p>
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-surface p-2 surface-shadow dark:border-white/5">
            <ComparisonTable summaries={children} />
          </div>
        </section>

        <section className="reveal mt-8" aria-labelledby="quick-record-title">
          <div className="mb-3 px-1">
            <p className="text-[11px] font-extrabold tracking-[0.14em] text-accent-deep">
              ONE-HAND LOG
            </p>
            <h2 id="quick-record-title" className="mt-0.5 text-lg font-extrabold tracking-[-0.02em]">
              아이별 빠른 기록
            </h2>
          </div>
          <div className="space-y-3">
            {children.map((child) => (
              <ChildCard
                key={child.childId}
                child={child}
                clockNow={clockNow}
                onFeeding={setFeedingChildId}
                onDiaper={recordDiaper}
                onSleep={toggleSleep}
              />
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={() => setVoiceOpen(true)}
          className="mt-5 flex min-h-16 w-full items-center justify-between rounded-[1.4rem] border border-ink/10 bg-ink px-4 text-left text-surface shadow-lg transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:border-white/10"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-surface/12">
              <Mic className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-extrabold">음성으로 기록</span>
              <span className="block text-[11px] text-surface/65">최대 30초 · Backend STT</span>
            </span>
          </span>
          <span className="rounded-full bg-surface/10 px-2.5 py-1 text-[10px] font-bold">녹음</span>
        </button>
      </main>

      <nav
        aria-label="주요 메뉴"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-2xl items-center justify-around border-t border-line/80 bg-surface/90 px-4 pt-2 backdrop-blur-xl"
      >
        <NavItem icon={LayoutDashboard} label="오늘" active />
        <NavItem icon={History} label="기록" />
        <NavItem icon={Users} label="아이" />
        <NavItem icon={Settings} label="설정" />
      </nav>

      {feedingChild ? (
        <FeedingSheet
          key={feedingChild.childId}
          child={feedingChild}
          onClose={() => setFeedingChildId(null)}
          onSave={recordFeeding}
        />
      ) : null}
      {voiceOpen ? <VoiceSheet onClose={() => setVoiceOpen(false)} /> : null}

      <div
        aria-live="polite"
        aria-atomic="true"
        className={`pointer-events-none fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-sm rounded-2xl bg-[#17221d] px-4 py-3 text-center text-sm font-bold text-white shadow-xl transition duration-200 ${
          toast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {toast ?? ""}
      </div>
    </div>
  );
}

type NavItemProps = {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
};

function NavItem({ icon: Icon, label, active = false }: NavItemProps) {
  return (
    <button
      type="button"
      disabled={!active}
      aria-current={active ? "page" : undefined}
      aria-label={active ? label : `${label} — 준비 중`}
      className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed ${
        active ? "text-accent-deep" : "text-ink-muted/65"
      }`}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
      {label}
    </button>
  );
}
