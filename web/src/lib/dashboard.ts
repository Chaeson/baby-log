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
};

export type DashboardSnapshot = {
  date: string;
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

