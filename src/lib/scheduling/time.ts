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

// Сьогоднішня дата за LA, «РРРР-ММ-ДД».
export function practiceToday(now: Date): string {
  return local(now).date;
}

// Північ дня `day` за LA як момент UTC: зсув поясу на цю дату береться з Intl, тож перехід на літній/зимовий час
// враховано (день переходу триває 23 чи 25 годин).
function practiceMidnight(day: string): Date {
  const guess = new Date(`${day}T00:00:00Z`);
  const { date, time } = local(guess);
  const offset = new Date(`${date}T${time}:00Z`).getTime() - guess.getTime();
  return new Date(guess.getTime() - offset);
}

// Межі дня `day` («РРРР-ММ-ДД») за LA: [start, end).
export function practiceDayRange(day: string): { start: Date; end: Date } {
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { start: practiceMidnight(day), end: practiceMidnight(next.toISOString().slice(0, 10)) };
}
