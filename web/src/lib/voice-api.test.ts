import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transcribeAudio } from "@/lib/voice-api";

describe("transcribeAudio", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("uploads browser audio as multipart without setting a client API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "둘째 응가했어", model: "gpt-4o-mini-transcribe" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio(new Blob(["voice"], { type: "audio/webm" }));

    expect(result.text).toBe("둘째 응가했어");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/v1/voice/transcriptions",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.headers).toBeUndefined();
  });

  it("surfaces safe Problem Details from the backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Backend에 OPENAI_API_KEY를 설정해 주세요" }),
      }),
    );

    await expect(
      transcribeAudio(new Blob(["voice"], { type: "audio/mp4" })),
    ).rejects.toThrow("Backend에 OPENAI_API_KEY를 설정해 주세요");
  });

  it("uses a generic error when the backend does not return JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new SyntaxError("not json");
        },
      }),
    );

    await expect(
      transcribeAudio(new Blob(["voice"], { type: "audio/ogg" })),
    ).rejects.toThrow("음성 인식에 실패했습니다");
  });

  it("trims transcripts and tolerates a missing model field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: "  첫째 잤어  " }),
      }),
    );

    await expect(
      transcribeAudio(new Blob(["voice"], { type: "audio/mpeg" })),
    ).resolves.toEqual({ text: "첫째 잤어", model: "unknown" });
  });

  it("rejects an empty successful transcript", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: "  ", model: "gpt-4o-mini-transcribe" }),
      }),
    );

    await expect(
      transcribeAudio(new Blob(["voice"], { type: "audio/wav" })),
    ).rejects.toThrow("인식된 문장이 비어 있습니다");
  });
});
