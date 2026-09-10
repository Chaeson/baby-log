"use client";

import { useState } from "react";
import { Milk, X } from "lucide-react";
import type { ChildDashboard } from "@/lib/dashboard";

const PRESET_AMOUNTS = [60, 80, 100, 120, 140] as const;

type FeedingSheetProps = {
  child: ChildDashboard;
  onClose: () => void;
  onSave: (amountMl: number) => void;
  disabled?: boolean;
  error?: string | null;
};

export function FeedingSheet({ child, onClose, onSave, disabled = false, error }: FeedingSheetProps) {
  const [customAmount, setCustomAmount] = useState("");
  const parsedAmount = Number(customAmount);
  const canSave = Number.isInteger(parsedAmount) && parsedAmount > 0 && parsedAmount <= 2000;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17221d]/45 px-0 backdrop-blur-[2px] sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="분유 기록 닫기"
      />
      <dialog
        open
        aria-modal="true"
        aria-labelledby="feeding-title"
        className="sheet-enter safe-bottom relative m-0 w-full max-w-lg rounded-t-[2rem] border-0 bg-surface p-5 text-ink surface-shadow sm:rounded-[2rem]"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line sm:hidden" />
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#fff0e8] text-accent-deep dark:bg-[#482d24]">
              <Milk className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold text-accent-deep">{child.name}</p>
              <h2 id="feeding-title" className="text-xl font-extrabold tracking-[-0.03em]">
                분유 얼마나 먹었나요?
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-canvas text-ink-muted transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="닫기"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <p className="mt-5 text-sm text-ink-muted">자주 쓰는 양은 누르면 바로 기록돼요.</p>
        {error && <p role="alert" className="mt-3 text-sm text-accent-deep">{error} 닫기 후 새로고침할 수 있어요.</p>}
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              disabled={disabled}
              type="button"
              onClick={() => onSave(amount)}
              className="min-h-14 rounded-2xl border border-line bg-surface-strong text-base font-extrabold tabular-nums shadow-sm transition hover:border-accent/60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`${amount}ml 기록`}
            >
              {amount}
              <span className="ml-0.5 text-xs font-semibold text-ink-muted">ml</span>
            </button>
          ))}
          <label className="col-span-3 mt-2">
            <span className="mb-2 block text-sm font-bold">직접 입력</span>
            <span className="flex min-h-14 items-center rounded-2xl border border-line bg-surface-strong px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
              <input
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="예: 110"
                aria-label="직접 분유량 입력"
                className="min-w-0 flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-ink-muted/50"
              />
              <span className="text-sm font-semibold text-ink-muted">ml</span>
            </span>
          </label>
        </div>
        <button
          type="button"
          disabled={disabled || !canSave}
          onClick={() => onSave(parsedAmount)}
          className="mt-4 min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-extrabold text-surface transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          기록하기
        </button>
      </dialog>
    </div>
  );
}
