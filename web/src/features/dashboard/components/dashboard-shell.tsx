"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Mic } from "lucide-react";
import type { DashboardSnapshot, DiaperKind } from "@/lib/dashboard";
import type { CareCommand } from "@/lib/api";
import { formatKoreanDate } from "@/lib/dashboard";
import { ChildCard } from "./child-card";
import { ComparisonTable } from "./comparison-table";
import { CurrentStatusSummary } from "./current-status-summary";
import { FeedingSheet } from "./feeding-sheet";
import { VoiceSheet } from "./voice-sheet";

type DashboardShellProps = {
  initialData: DashboardSnapshot;
  onRecord: (command: CareCommand) => Promise<unknown>;
  onRefresh: () => Promise<void>;
};

export function DashboardShell({ initialData, onRecord, onRefresh }: DashboardShellProps) {
  const children = initialData.children;
  const [feedingChildId, setFeedingChildId] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.parse(initialData.generatedAt));
  const mutationRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedingChild = children.find((child) => child.childId === feedingChildId);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    let active = true;
    let refreshing = false;
    const sync = () => {
      if (document.visibilityState === "hidden" || mutationRef.current || refreshing) return;
      refreshing = true;
      void onRefresh()
        .then(() => { if (active) setClockNow(Date.now()); })
        .catch(() => { if (active) setError("최신 상태를 불러오지 못했어요. 새로고침해 주세요."); })
        .finally(() => { refreshing = false; });
    };
    // A retained workspace may contain an older snapshot when this screen returns.
    sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    const timer = window.setInterval(sync, 30_000);
    return () => {
      active = false;
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      window.clearInterval(timer);
    };
  }, [onRefresh]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  async function refresh() {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setPending(true);
    try {
      await onRefresh();
      setError(null); setNeedsRefresh(false); setClockNow(Date.now());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "새로고침하지 못했어요.");
    } finally { mutationRef.current = false; setPending(false); }
  }

  async function save(command: CareCommand, message: string) {
    if (mutationRef.current || needsRefresh) return;
    mutationRef.current = true; setPending(true); setError(null);
    let saved = false;
    try {
      await onRecord(command);
      saved = true;
      setFeedingChildId(null);
      showToast(message);
      await onRefresh();
      setClockNow(Date.now());
    } catch (cause) {
      setNeedsRefresh(true);
      setError(saved ? "기록은 저장됐어요. 화면 갱신에 실패했으니 새로고침해 주세요."
        : cause instanceof Error ? cause.message : "저장 결과를 확인하지 못했어요. 기록을 새로고침해 주세요.");
    } finally { mutationRef.current = false; setPending(false); }
  }

  function recordFeeding(amountMl: number) {
    if (feedingChild) void save({ type: "FEEDING", childId: feedingChild.childId, amountMl },
      `${feedingChild.name} 분유 ${amountMl}ml를 기록했어요`);
  }

  function recordDiaper(childId: string, kind: DiaperKind) {
    const child = children.find((item) => item.childId === childId);
    if (child) void save({ type: "DIAPER", childId, diaperType: kind === "pee" ? "PEE" : "POOP" },
      `${child.name} ${kind === "pee" ? "소변" : "대변"}을 기록했어요`);
  }

  function toggleSleep(childId: string) {
    const child = children.find((item) => item.childId === childId);
    if (!child) return;
    if (child.sleep.isSleeping) {
      const sleepId = child.currentState.sleep.eventId;
      if (!sleepId) { setError("수면 기록을 확인하려면 새로고침해 주세요."); setNeedsRefresh(true); return; }
      void save({ type: "SLEEP_END", sleepId }, `${child.name} 깨어남을 기록했어요`);
    } else {
      void save({ type: "SLEEP_START", childId }, `${child.name} 수면을 시작했어요`);
    }
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
                가족 기록
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
          <button type="button" disabled={pending} onClick={() => void refresh()} className="action">새로고침</button>
        </header>
        {error && <p role="alert" className="panel mt-4 text-accent-deep">{error}</p>}
        {pending && <p role="status" className="mt-3 text-sm">처리 중…</p>}
        {children.length === 0 && <p className="panel mt-5">등록된 아이가 없어요. 설정에서 가족을 확인해 주세요.</p>}

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
              summaries={children}
              referenceAt={new Date(clockNow).toISOString()}
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
                disabled={pending || needsRefresh}
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
              <span className="block text-[11px] text-surface/65">최대 30초 · 말한 내용을 확인해요</span>
            </span>
          </span>
          <span className="rounded-full bg-surface/10 px-2.5 py-1 text-[10px] font-bold">녹음</span>
        </button>
      </main>



      {feedingChild ? (
        <FeedingSheet
          key={feedingChild.childId}
          child={feedingChild}
          onClose={() => setFeedingChildId(null)}
          onSave={recordFeeding}
          disabled={pending || needsRefresh}
          error={error}
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
