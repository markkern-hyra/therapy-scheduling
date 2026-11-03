import { describe, expect, it } from "vitest";
import {
  formatDayStep,
  formatPracticeDateTime,
  formatPracticeTime,
  isPracticeDay,
  practiceDayRange,
  practiceToday,
  shiftPracticeDay, practiceWeek, } from "@/lib/scheduling/time";

describe("time: часовий пояс практики America/Los_Angeles", () => {
  it("показує дату й час у форматі РРРР-ММ-ДД ГГ:ХХ за LA", () => {
    expect(formatPracticeDateTime(new Date("2026-11-03T22:30:00Z"))).toBe("2026-11-03 14:30");
    expect(formatPracticeDateTime(new Date("2026-10-26T16:05:00Z"))).toBe("2026-10-26 09:05");
  });

  it("межі дня за LA — у UTC", () => {
    expect(practiceDayRange("2026-11-03")).toEqual({
      start: new Date("2026-11-03T08:00:00Z"),
      end: new Date("2026-11-04T08:00:00Z"),
    });
  });

  it("день переходу на зимовий час триває 25 годин", () => {
    expect(practiceDayRange("2026-11-01")).toEqual({
      start: new Date("2026-11-01T07:00:00Z"),
      end: new Date("2026-11-02T08:00:00Z"),
    });
  });

  it("день переходу на літній час триває 23 години", () => {
    expect(practiceDayRange("2026-03-08")).toEqual({
      start: new Date("2026-03-08T08:00:00Z"),
      end: new Date("2026-03-09T07:00:00Z"),
    });
  });

  it("сьогодні — дата за LA, а не за UTC", () => {
    expect(practiceToday(new Date("2026-11-04T07:30:00Z"))).toBe("2026-11-03");
  });

  it("час без дати — ГГ:ХХ за LA", () => {
    expect(formatPracticeTime(new Date("2026-11-03T18:00:00Z"))).toBe("10:00");
  });

  it("день з адреси — лише справжня дата РРРР-ММ-ДД", () => {
    expect(isPracticeDay("2026-11-03")).toBe(true);
    expect(isPracticeDay("2026-02-29")).toBe(false);
    expect(isPracticeDay("2026-02-30")).toBe(false);
    expect(isPracticeDay("2026-13-45")).toBe(false);
    expect(isPracticeDay("0000-01-01")).toBe(false);
    expect(isPracticeDay("2026-1-3")).toBe(false);
    expect(isPracticeDay(["2026-11-03"])).toBe(false);
  });

  it("сусідній день — календарний крок через межу місяця й року і день переходу часу", () => {
    expect(shiftPracticeDay("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftPracticeDay("2027-01-01", -1)).toBe("2026-12-31");
    expect(shiftPracticeDay("2026-11-01", 1)).toBe("2026-11-02");
  });

  it("підпис дня для кроків днями — день тижня й число місяця", () => {
    expect(formatDayStep("2026-10-27")).toBe("Tue 27");
    expect(formatDayStep("2026-11-01")).toBe("Sun 1");
  });
});

describe("тиждень у часовому поясі практики", () => {
  it("день з адреси поза межами, які приймає база, — не дата сторінки", () => {
    expect(isPracticeDay("9999-12-31")).toBe(false);
    expect(isPracticeDay("2026-11-04")).toBe(true);
  });

  it("AC-HOLD-30: середа 2026-11-04 — тиждень 2026-11-02 – 2026-11-08", () => {
    const week = practiceWeek("2026-11-04");
    expect([week.monday, week.sunday]).toEqual(["2026-11-02", "2026-11-08"]);
    expect(week.start.toISOString()).toBe("2026-11-02T08:00:00.000Z");
    expect(week.end.toISOString()).toBe("2026-11-09T08:00:00.000Z");
  });

  it("AC-HOLD-30: неділя належить до тижня, що почався в понеділок; понеділок — до свого", () => {
    expect(practiceWeek("2026-11-08").monday).toBe("2026-11-02");
    expect(practiceWeek("2026-11-09").monday).toBe("2026-11-09");
  });

  it("AC-HOLD-31: наступний тиждень — 2026-11-09 – 2026-11-15", () => {
    const next = practiceWeek(shiftPracticeDay(practiceWeek("2026-11-04").monday, 7));
    expect([next.monday, next.sunday]).toEqual(["2026-11-09", "2026-11-15"]);
  });
});
