import { describe, expect, it } from "vitest";
import { formatPracticeDateTime, practiceDayRange, practiceToday } from "@/lib/scheduling/time";

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

  it("сьогодні — дата за LA, а не за UTC", () => {
    expect(practiceToday(new Date("2026-11-04T07:30:00Z"))).toBe("2026-11-03");
  });
});
