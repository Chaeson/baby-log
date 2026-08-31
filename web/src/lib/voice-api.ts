export type TranscriptionResponse = {
  text: string;
  model: string;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

export async function transcribeAudio(
  audio: Blob,
  signal?: AbortSignal,
): Promise<TranscriptionResponse> {
  const formData = new FormData();
  formData.append("audio", audio, `voice.${extensionFor(audio.type)}`);

  const response = await fetch(`${API_BASE_URL}/api/v1/voice/transcriptions`, {
    method: "POST",
    body: formData,
    signal,
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : "음성 인식에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
  if (typeof body.text !== "string" || body.text.trim() === "") {
    throw new Error("인식된 문장이 비어 있습니다. 다시 말해 주세요.");
  }

  return {
    text: body.text.trim(),
    model: typeof body.model === "string" ? body.model : "unknown",
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function extensionFor(contentType: string): string {
  const baseType = contentType.split(";", 1)[0];
  if (baseType === "audio/mp4") return "m4a";
  if (baseType === "audio/ogg") return "ogg";
  if (baseType === "audio/mpeg") return "mp3";
  if (baseType === "audio/wav" || baseType === "audio/x-wav") return "wav";
  return "webm";
}
