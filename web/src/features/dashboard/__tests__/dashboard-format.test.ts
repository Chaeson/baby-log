import { describe, expect, it } from "vitest";
import {
  formatElapsed,
  formatKoreanDate,
  formatMinutes,
  formatRelativeTime,
} from "@/lib/dashboard";

describe("dashboard formatters", () => {
  it("formats accumulated sleep minutes in Korean", () => {
    expect(formatMinutes(800)).toBe("13시간 20분");
    expect(formatMinutes(60)).toBe("1시간");
    expect(formatMinutes(42)).toBe("42분");
  });

  it("formats live sleep duration as a fixed timer", () => {
    expect(formatElapsed(5025)).toBe("01:23:45");
  });

  it("formats a date in the family dashboard time zone", () => {
    expect(formatKoreanDate("2026-08-31")).toContain("8월 31일");
    expect(formatKoreanDate("2026-08-31")).toContain("월요일");
  });

  it("formats care event times relative to the dashboard snapshot", () => {
    const generatedAt = "2026-08-31T12:00:00Z";

    expect(formatRelativeTime("2026-08-31T11:59:30Z", generatedAt)).toBe("방금 전");
    expect(formatRelativeTime("2026-08-31T11:20:00Z", generatedAt)).toBe("40분 전");
    expect(formatRelativeTime("2026-08-31T10:40:00Z", generatedAt)).toBe("1시간 20분 전");
    expect(formatRelativeTime(undefined, generatedAt)).toBe("기록 없음");
  });
});
