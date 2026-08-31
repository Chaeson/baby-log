"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  LoaderCircle,
  Mic,
  RotateCcw,
  ShieldCheck,
  Square,
  X,
} from "lucide-react";
import { transcribeAudio } from "@/lib/voice-api";

const MAX_RECORDING_SECONDS = 30;
const MIME_TYPE_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

type RecorderStatus = "idle" | "requesting" | "recording" | "transcribing" | "success" | "error";

type VoiceSheetProps = {
  onClose: () => void;
};

export function VoiceSheet({ onClose }: VoiceSheetProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.stop();
      }
      chunksRef.current = [];
      stopStream();
    };
  }, []);

  useEffect(() => {
    if (status !== "recording") return;
    const timer = window.setInterval(
      () => setElapsedSeconds((current) => current + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [status]);

  async function startRecording() {
    setTranscript(null);
    setErrorMessage(null);
    setElapsedSeconds(0);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      setErrorMessage("이 브라우저에서는 마이크 녹음을 지원하지 않습니다.");
      return;
    }

    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (!mountedRef.current) {
        stopStream();
        return;
      }

      const mimeType = selectMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => void uploadRecording(recorder.mimeType || mimeType);
      recorder.onerror = () => {
        stopStream();
        if (!mountedRef.current) return;
        setStatus("error");
        setErrorMessage("녹음 중 문제가 발생했습니다. 다시 시도해 주세요.");
      };

      recorder.start();
      setStatus("recording");
      timeoutRef.current = setTimeout(stopRecording, MAX_RECORDING_SECONDS * 1000);
    } catch (error) {
      stopStream();
      if (!mountedRef.current) return;
      setStatus("error");
      setErrorMessage(messageForMicrophoneError(error));
    }
  }

  function stopRecording() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      setStatus("transcribing");
      recorder.stop();
    }
  }

  async function uploadRecording(mimeType: string) {
    stopStream();
    const audio = new Blob(chunksRef.current, {
      type: mimeType || "audio/webm",
    });
    chunksRef.current = [];
    abortRef.current = new AbortController();

    try {
      const result = await transcribeAudio(audio, abortRef.current.signal);
      if (!mountedRef.current) return;
      setTranscript(result.text);
      setStatus("success");
    } catch (error) {
      if (!mountedRef.current || (error instanceof DOMException && error.name === "AbortError")) {
        return;
      }
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "음성 인식에 실패했습니다. 다시 시도해 주세요.",
      );
    } finally {
      abortRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  const isBusy = status === "requesting" || status === "transcribing";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17221d]/45 backdrop-blur-[2px] sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="음성 기록 닫기"
      />
      <dialog
        open
        aria-modal="true"
        aria-labelledby="voice-title"
        className="sheet-enter safe-bottom relative m-0 w-full max-w-lg rounded-t-[2rem] border-0 bg-surface p-5 text-ink surface-shadow sm:rounded-[2rem]"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line sm:hidden" />
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-extrabold tracking-[0.12em] text-sage-deep">
              BACKEND SPEECH-TO-TEXT
            </p>
            <h2 id="voice-title" className="font-display text-2xl leading-tight text-ink">
              말로 육아 기록하기
            </h2>
            <p className="mt-1.5 text-xs text-ink-muted">
              “첫째 분유 120 먹었어”처럼 말해 보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-canvas text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            aria-label="닫기"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="mt-5 rounded-[1.75rem] border border-line bg-canvas/70 p-5 text-center">
          <div
            className={`mx-auto grid size-20 place-items-center rounded-full transition ${
              status === "recording"
                ? "bg-[#d94f3d] text-white shadow-[0_0_0_10px_rgb(217_79_61/12%)]"
                : status === "success"
                  ? "bg-sage text-white"
                  : "bg-ink text-surface"
            }`}
            aria-hidden="true"
          >
            {status === "requesting" || status === "transcribing" ? (
              <LoaderCircle className="size-8 animate-spin" />
            ) : status === "recording" ? (
              <span className="size-4 animate-pulse rounded-sm bg-white" />
            ) : status === "success" ? (
              <Check className="size-8" />
            ) : (
              <Mic className="size-8" />
            )}
          </div>

          <div className="mt-4 min-h-12" aria-live="polite">
            {status === "recording" ? (
              <>
                <p className="font-mono text-xl font-extrabold tabular-nums">
                  00:{elapsedSeconds.toString().padStart(2, "0")}
                </p>
                <p className="mt-1 text-xs text-ink-muted">듣고 있어요 · 최대 30초</p>
              </>
            ) : status === "transcribing" ? (
              <>
                <p className="font-extrabold">말을 글로 바꾸고 있어요</p>
                <p className="mt-1 text-xs text-ink-muted">녹음은 안전하게 Backend로 전송됩니다.</p>
              </>
            ) : transcript ? (
              <div className="text-left">
                <p className="text-[11px] font-extrabold tracking-[0.1em] text-sage-deep">
                  인식한 문장
                </p>
                <p className="mt-1.5 text-base font-bold leading-6">{transcript}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  아직 육아 기록에는 반영되지 않았어요. 다음 단계에서 확인 후 저장을 연결합니다.
                </p>
              </div>
            ) : (
              <>
                <p className="font-extrabold">
                  {status === "requesting" ? "마이크를 준비하고 있어요" : "버튼을 누르고 말해 주세요"}
                </p>
                <p className="mt-1 text-xs text-ink-muted">권한은 녹음 시작을 누를 때만 요청합니다.</p>
              </>
            )}
          </div>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-3 rounded-2xl border border-[#e7b6aa] bg-[#fff0ec] px-4 py-3 text-sm font-semibold text-[#8f321f] dark:border-[#713e34] dark:bg-[#442a25] dark:text-[#ffc1af]"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-canvas/70 p-3.5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sage-deep" aria-hidden="true" />
          <p className="text-xs leading-5 text-ink-muted">
            OpenAI API Key는 Spring Backend에만 보관합니다. 브라우저에는 노출되지 않습니다.
          </p>
        </div>

        {status === "recording" ? (
          <button
            type="button"
            onClick={stopRecording}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#d94f3d] font-extrabold text-white transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d94f3d] focus-visible:ring-offset-2"
            aria-label="녹음 끝내기"
          >
            <Square className="size-4 fill-current" aria-hidden="true" />
            녹음 끝내기
          </button>
        ) : (
          <button
            type="button"
            disabled={isBusy}
            onClick={startRecording}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink font-extrabold text-surface transition enabled:active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
            aria-label={transcript || errorMessage ? "다시 녹음" : "녹음 시작"}
          >
            {isBusy ? (
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            ) : transcript || errorMessage ? (
              <RotateCcw className="size-5" aria-hidden="true" />
            ) : (
              <Mic className="size-5" aria-hidden="true" />
            )}
            {status === "requesting"
              ? "마이크 준비 중"
              : status === "transcribing"
                ? "음성 인식 중"
                : transcript || errorMessage
                  ? "다시 녹음"
                  : "녹음 시작"}
          </button>
        )}
      </dialog>
    </div>
  );
}

function selectMimeType(): string {
  return MIME_TYPE_CANDIDATES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function messageForMicrophoneError(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "마이크 권한을 허용해 주세요. 브라우저 주소창의 권한 설정에서 변경할 수 있어요.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "사용할 수 있는 마이크를 찾지 못했습니다.";
  }
  return "마이크를 시작하지 못했습니다. 브라우저 권한을 확인해 주세요.";
}
