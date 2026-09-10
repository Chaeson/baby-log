export function seoulDate(at = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function dateRange(date: string, days: number) {
  return {
    from: new Date(`${shiftDate(date, 1 - days)}T00:00:00+09:00`).toISOString(),
    to: new Date(`${shiftDate(date, 1)}T00:00:00+09:00`).toISOString(),
  };
}

export function recordTime(at: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(at));
}
