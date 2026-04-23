export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getDaysAgo(dateStr: string): number {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export function getMonthsFromNow(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return (
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth())
  );
}

/** 指定日の週の月曜日を YYYY-MM-DD で返す */
export function getMondayOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=日
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** offsetWeeks=0: 今週月曜, 1: 来週月曜, ... */
export function getWeekStart(offsetWeeks = 0): string {
  const monday = getMondayOfWeek();
  monday.setDate(monday.getDate() + offsetWeeks * 7);
  return toYMD(monday);
}

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "今週" "来週" "再来週" "3週後" "4週後" */
export function formatWeekLabel(offset: number): string {
  const labels = ["今週", "来週", "再来週", "3週後", "4週後"];
  return labels[offset] ?? `${offset}週後`;
}

/** 今日が金曜日かどうか */
export function isFriday(): boolean {
  return new Date().getDay() === 5;
}

/** 今週の日付範囲 [月曜, 翌月曜) */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const start = getMondayOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}
