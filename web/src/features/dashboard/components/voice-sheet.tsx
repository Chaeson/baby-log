"use client";

import { Mic, ShieldCheck, Sparkles, X } from "lucide-react";

type VoiceSheetProps = {
  onClose: () => void;
};

export function VoiceSheet({ onClose }: VoiceSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17221d]/45 backdrop-blur-[2px] sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="음성 기록 안내 닫기"
      />
      <dialog
        open
        aria-modal="true"
        aria-labelledby="voice-title"
        className="sheet-enter safe-bottom relative m-0 w-full max-w-lg rounded-t-[2rem] border-0 bg-surface p-5 text-ink surface-shadow sm:rounded-[2rem]"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="mb-4 grid size-14 place-items-center rounded-full bg-ink text-surface">
              <Mic className="size-6" aria-hidden="true" />
            </span>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold text-sage-deep">
              <Sparkles className="size-3.5" aria-hidden="true" />
              VOICE-FIRST · NEXT PHASE
            </p>
            <h2 id="voice-title" className="font-display text-2xl leading-tight text-ink">
              “둘째 응가했고<br />분유 90 먹었어”
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-canvas text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            aria-label="닫기"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-5 text-sm leading-6 text-ink-muted">
          마이크 UI는 준비되어 있어요. 다음 단계에서 브라우저가 녹음한 오디오를 Backend로 보내고, 검증된 구조화 이벤트만 저장합니다.
        </p>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-canvas/70 p-3.5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sage-deep" aria-hidden="true" />
          <p className="text-xs leading-5 text-ink-muted">
            브라우저에는 AI API Key를 두지 않습니다. 마이크 권한도 사용자가 버튼을 누른 뒤에만 요청합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-14 w-full rounded-2xl bg-ink font-extrabold text-surface transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
        >
          확인
        </button>
      </dialog>
    </div>
  );
}

