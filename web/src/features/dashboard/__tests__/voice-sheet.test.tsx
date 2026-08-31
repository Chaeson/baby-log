import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
});
