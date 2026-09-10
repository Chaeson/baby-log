import type { ChildAccent, DashboardSnapshot } from "./dashboard";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "");
export const FAMILY_STORAGE_KEY = "twinlog:family:v1";
export const ZONE_ID = "Asia/Seoul";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 15_000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: "입력 내용과 날짜 범위를 확인해 주세요.",
        404: "가족 또는 기록을 찾지 못했어요. 가족 연결을 확인해 주세요.",
        409: "다른 보호자가 상태를 변경했을 수 있어요. 새로고침 후 확인해 주세요.",
      };
      throw new ApiError(messages[response.status] ?? "서버에서 요청을 처리하지 못했어요. 잠시 후 다시 확인해 주세요.", response.status);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (init.signal?.aborted) throw error;
    throw new ApiError(init.method === "POST"
      ? "저장 결과를 확인하지 못했어요. 다시 누르기 전에 기록을 새로고침해 주세요."
      : "서버에 연결하지 못했어요. 서버 실행 상태를 확인하고 다시 시도해 주세요.", 0);
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", cancel);
  }
}

export type Family = { id: string; name: string };
export type Child = { id: string; name: string; birthOrder: number; birthDate?: string };
export type ChildInput = { name: string; birthOrder: number; birthDate?: string };
type TodayResponse = {
  familyId: string; date: string; generatedAt: string;
  children: {
    childId: string; name: string; nickname?: string; birthOrder: number;
    feedingTotalMl: number; feedingCount: number; peeCount: number; poopCount: number; sleepMinutes: number;
    currentState: DashboardSnapshot["children"][number]["currentState"];
  }[];
};

export function toDashboard(response: TodayResponse, familyName: string): DashboardSnapshot {
  const accents: ChildAccent[] = ["apricot", "sage", "sky", "lilac"];
  return {
    date: response.date, generatedAt: response.generatedAt, familyName,
    children: response.children.map((child) => ({
      childId: child.childId, name: child.name, nickname: child.nickname,
      accent: accents[(child.birthOrder - 1) % accents.length],
      feeding: { totalMl: child.feedingTotalMl, count: child.feedingCount },
      diaper: { pee: child.peeCount, poop: child.poopCount },
      sleep: { totalMinutes: child.sleepMinutes, isSleeping: child.currentState.sleep.status === "SLEEPING", startedAt: child.currentState.sleep.since ?? undefined },
      currentState: child.currentState,
    })),
  };
}

export async function loadWorkspace(familyId: string, signal?: AbortSignal) {
  const id = encodeURIComponent(familyId);
  const [family, today] = await Promise.all([
    request<Family>(`/families/${id}`, { signal }),
    request<TodayResponse>(`/families/${id}/dashboard/today?zoneId=${ZONE_ID}`, { signal }),
  ]);
  return { family, dashboard: toDashboard(today, family.name) };
}

export const setupFamily = (name: string, children: ChildInput[]) =>
  request<{ family: Family; children: Child[] }>("/families/setup", { method: "POST", body: JSON.stringify({ name, children }) });

export type CareCommand =
  | { type: "FEEDING"; childId: string; amountMl: number }
  | { type: "DIAPER"; childId: string; diaperType: "PEE" | "POOP" | "BOTH" }
  | { type: "SLEEP_START"; childId: string }
  | { type: "SLEEP_END"; sleepId: string };

export function recordCare(command: CareCommand) {
  if (command.type === "SLEEP_END") return request(`/events/sleeps/${encodeURIComponent(command.sleepId)}/end`, { method: "POST", body: "{}" });
  const paths = { FEEDING: "feedings", DIAPER: "diapers", SLEEP_START: "sleeps/start" };
  const { type, ...body } = command;
  return request(`/events/${paths[type]}`, { method: "POST", body: JSON.stringify(body) });
}

export type TimelineEvent = {
  id: string; childId: string; childName: string;
  eventType: "FEEDING" | "DIAPER" | "SLEEP";
  occurredAt: string; startedAt: string | null; endedAt: string | null;
  amountMl: number | null; diaperType: "PEE" | "POOP" | "BOTH" | null; memo: string | null;
};
export type Timeline = { familyId: string; from: string; to: string; events: TimelineEvent[] };
export const loadTimeline = (familyId: string, from: string, to: string, signal?: AbortSignal) =>
  request<Timeline>(`/families/${encodeURIComponent(familyId)}/events?${new URLSearchParams({ from, to })}`, { signal });

export type DailyInsight = { date: string; feedingTotalMl: number; feedingCount: number; sleepMinutes: number; peeCount: number; poopCount: number };
export type ChildInsight = {
  childId: string; name: string; birthOrder: number; recordedDays: number;
  averageDailyFeedingMl: number; averageFeedingMl: number | null; minFeedingMl: number | null; maxFeedingMl: number | null;
  averageFeedingIntervalMinutes: number | null; averageDailySleepMinutes: number; longestSleepMinutes: number | null;
  averageDailyPeeCount: number; averageDailyPoopCount: number; days: DailyInsight[];
};
export type Insights = { from: string; to: string; generatedAt: string; children: ChildInsight[] };
export const loadInsights = (familyId: string, days: number, signal?: AbortSignal) =>
  request<Insights>(`/families/${encodeURIComponent(familyId)}/insights?${new URLSearchParams({ days: String(days), zoneId: ZONE_ID })}`, { signal });
