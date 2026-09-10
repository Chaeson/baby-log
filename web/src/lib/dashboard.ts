export type ChildAccent = "apricot" | "sage" | "sky" | "lilac";

export type ChildDashboard = {
  childId: string;
  name: string;
  nickname?: string;
  accent: ChildAccent;
  feeding: {
    totalMl: number;
    count: number;
  };
  diaper: {
    pee: number;
    poop: number;
  };
  sleep: {
    totalMinutes: number;
    isSleeping: boolean;
    startedAt?: string;
  };
  currentState: {
    lastFeeding: {
      amountMl: number;
      occurredAt: string;
    } | null;
    sleep: {
      status: "SLEEPING" | "AWAKE";
      since: string | null;
      eventId?: string | null;
    };
    lastPeeAt: string | null;
    lastPoopAt: string | null;
  };
};

export type DashboardSnapshot = {
  date: string;
  generatedAt: string;
  familyName: string;
  children: ChildDashboard[];
};

export type DiaperKind = "pee" | "poop";

export function formatMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

export function formatElapsed(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

export function formatKoreanDate(date: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${date}T00:00:00+09:00`));
}

export function formatRelativeTime(
  occurredAt: string | null | undefined,
  referenceAt: string,
): string {
  if (!occurredAt) return "기록 없음";

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.parse(referenceAt) - Date.parse(occurredAt)) / 60_000),
  );
  if (elapsedMinutes < 1) return "방금 전";

  const days = Math.floor(elapsedMinutes / (24 * 60));
  const hours = Math.floor((elapsedMinutes % (24 * 60)) / 60);
  const minutes = elapsedMinutes % 60;

  if (days > 0) return hours > 0 ? `${days}일 ${hours}시간 전` : `${days}일 전`;
  if (hours > 0) return minutes > 0 ? `${hours}시간 ${minutes}분 전` : `${hours}시간 전`;
  return `${minutes}분 전`;
}

export function formatStatusDuration(
  status: "SLEEPING" | "AWAKE",
  since: string | null | undefined,
  referenceAt: string,
): string {
  if (!since) return status === "SLEEPING" ? "수면 시작 기록 없음" : "깨어있음 · 시간 기록 없음";

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.parse(referenceAt) - Date.parse(since)) / 60_000),
  );
  const duration = formatMinutes(elapsedMinutes);
  return status === "SLEEPING" ? `수면 중 ${duration}` : `깨어있는 지 ${duration}`;
}
