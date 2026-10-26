// Час практики: увесь показ і межі дня — America/Los_Angeles (Припущення PM), без бібліотек дат.
export const PRACTICE_TIME_ZONE = "America/Los_Angeles";

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: PRACTICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function local(date: Date) {
  const p = Object.fromEntries(parts.formatToParts(date).map(({ type, value }) => [type, value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

// «2026-11-03 14:30» — формат PM (24 години).
export function formatPracticeDateTime(date: Date): string {
  const { date: day, time } = local(date);
  return `${day} ${time}`;
}

// «14:30» — лише час слоту, коли день уже обрано.
export function formatPracticeTime(date: Date): string {
  return local(date).time;
}

// Сьогоднішня дата за LA, «РРРР-ММ-ДД».
export function practiceToday(now: Date): string {
  return local(now).date;
}

// Північ дня `day` за LA як момент UTC. Зсув поясу береться в момент `dayT00:00Z` (16:00 чи 17:00 попереднього дня за
// LA); це вірно, бо в США час переходить о 02:00 за місцевим часом — уже після півночі. День переходу триває 23 чи
// 25 годин.
function practiceMidnight(day: string): Date {
  const guess = new Date(`${day}T00:00:00Z`);
  const { date, time } = local(guess);
  const offset = new Date(`${date}T${time}:00Z`).getTime() - guess.getTime();
  return new Date(guess.getTime() - offset);
}

// День з адреси (?day=…) — лише справжня дата «РРРР-ММ-ДД» не раніше 1970 року; інакше сторінка бере сьогодні.
export function isPracticeDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1970-01-01") return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  // 2026-02-30 Date «перекочує» на 2026-03-02 — така дата не збігається з собою після перетворення.
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

// Календарний день за `days` днів від `day` («РРРР-ММ-ДД»): арифметика дат, без годин, тож переходи часу не заважають.
export function shiftPracticeDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const dayStep = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", day: "numeric" });

// «Tue 27» — підпис кроку днями на сторінці слотів.
export function formatDayStep(day: string): string {
  const p = Object.fromEntries(dayStep.formatToParts(new Date(`${day}T00:00:00Z`)).map(({ type, value }) => [type, value]));
  return `${p.weekday} ${p.day}`;
}

// Межі дня `day` («РРРР-ММ-ДД») за LA: [start, end).
export function practiceDayRange(day: string): { start: Date; end: Date } {
  return { start: practiceMidnight(day), end: practiceMidnight(shiftPracticeDay(day, 1)) };
}
