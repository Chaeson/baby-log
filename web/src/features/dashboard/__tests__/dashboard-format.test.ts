import { describe, expect, it } from "vitest";
import { formatElapsed, formatKoreanDate, formatMinutes } from "@/lib/dashboard";

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
});

