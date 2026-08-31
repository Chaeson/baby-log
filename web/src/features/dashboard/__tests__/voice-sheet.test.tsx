import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceSheet } from "@/features/dashboard/components/voice-sheet";

const stopTrack = vi.fn();

class FakeMediaRecorder {
  static isTypeSupported() {
    return true;
  }

  state: RecordingState = "inactive";
  mimeType = "audio/webm;codecs=opus";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["recorded-audio"], { type: "audio/webm" }),
    } as BlobEvent);
    this.onstop?.(new Event("stop"));
  }
}

describe("VoiceSheet", () => {
  beforeEach(() => {
    stopTrack.mockClear();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopTrack }],
        }),
      },
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "첫째 분유 120 먹었어",
          model: "gpt-4o-mini-transcribe",
        }),
      }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("records only after a user gesture and shows the backend transcript", async () => {
    const user = userEvent.setup();
    render(<VoiceSheet onClose={vi.fn()} />);

    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "녹음 시작" }));

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(screen.getByRole("button", { name: "녹음 끝내기" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "녹음 끝내기" }));

    expect(await screen.findByText("첫째 분유 120 먹었어")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledOnce();
    expect(stopTrack).toHaveBeenCalledOnce();
  });

  it("explains how to recover when microphone permission is denied", async () => {
    const user = userEvent.setup();
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );
    render(<VoiceSheet onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "녹음 시작" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "마이크 권한을 허용해 주세요",
    );
  });

  it("explains when the browser cannot record audio", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });
    render(<VoiceSheet onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "녹음 시작" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이 브라우저에서는 마이크 녹음을 지원하지 않습니다",
    );
  });

  it("shows a safe backend error and allows retrying", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Backend에 OPENAI_API_KEY를 설정해 주세요" }),
      }),
    );
    render(<VoiceSheet onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "녹음 시작" }));
    await user.click(screen.getByRole("button", { name: "녹음 끝내기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Backend에 OPENAI_API_KEY를 설정해 주세요",
    );
    expect(screen.getByRole("button", { name: "다시 녹음" })).toBeInTheDocument();
  });

  it("discards audio without uploading when the user closes during recording", async () => {
    const user = userEvent.setup();

    function ClosableVoiceSheet() {
      const [open, setOpen] = useState(true);
      return open ? <VoiceSheet onClose={() => setOpen(false)} /> : null;
    }

    render(<ClosableVoiceSheet />);
    await user.click(screen.getByRole("button", { name: "녹음 시작" }));
    await user.click(screen.getByRole("button", { name: "닫기" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(stopTrack).toHaveBeenCalledOnce();
  });
});
